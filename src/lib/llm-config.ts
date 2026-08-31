import { prisma } from "@/lib/prisma";
import { getMemoryIntegrationFlags } from "@/lib/integrations/feature-flags";

export type LlmConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
};

/**
 * 用量统计网关（New API）覆盖配置。
 * 设置 LLM_GATEWAY_BASE_URL + LLM_GATEWAY_API_KEY 后，所有 LLM 调用改走网关，
 * 网关会记录每次请求的 token 数与耗时，并按请求体里的 user 字段归因到用户。
 * model 仍沿用各 provider 配置——网关按模型名路由到对应上游渠道。
 * 账户页关闭「本地/网关大模型」后立即不走网关。
 */
export function getGatewayOverride(): Pick<LlmConfig, "baseUrl" | "apiKey"> | null {
  if (getMemoryIntegrationFlags().localLlmGateway === false) return null;
  const baseUrl = env("LLM_GATEWAY_BASE_URL");
  const apiKey = env("LLM_GATEWAY_API_KEY");
  if (!baseUrl || !apiKey) return null;
  return { baseUrl: normalizeBaseUrl(baseUrl), apiKey };
}

export function isGatewayEnabled(): boolean {
  return getGatewayOverride() !== null;
}

const PROVIDERS = {
  deepseek: {
    baseUrl: "https://api.deepseek.com/v1",
    model: "deepseek-v4-pro",
    envKeys: ["DEEPSEEK_API_KEY"],
    baseUrlEnv: ["DEEPSEEK_BASE_URL"],
    modelEnv: ["DEEPSEEK_MODEL"],
  },
  doubao: {
    baseUrl: "https://ark.cn-beijing.volces.com",
    model: "doubao-seed-2-1-pro-260628",
    envKeys: ["ARK_API_KEY", "DOUBAO_API_KEY"],
    baseUrlEnv: ["ARK_BASE_URL", "DOUBAO_BASE_URL"],
    modelEnv: ["ARK_MODEL", "DOUBAO_MODEL"],
  },
  qwen: {
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    model: "qwen3.8-max",
    envKeys: ["QWEN_API_KEY", "DASHSCOPE_API_KEY"],
    baseUrlEnv: ["QWEN_BASE_URL", "DASHSCOPE_BASE_URL"],
    modelEnv: ["QWEN_MODEL"],
  },
  kimi: {
    baseUrl: "https://api.moonshot.cn/v1",
    model: "kimi-k2.6",
    envKeys: ["MOONSHOT_API_KEY", "KIMI_API_KEY"],
    baseUrlEnv: ["MOONSHOT_BASE_URL"],
    modelEnv: ["MOONSHOT_MODEL"],
  },
  openai: {
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-5.6-sol",
    envKeys: ["OPENAI_API_KEY"],
    baseUrlEnv: ["OPENAI_BASE_URL"],
    modelEnv: ["OPENAI_MODEL"],
  },
  /** 仅补本站没有的模型（如 Gemini）。默认走 API2D 等 OpenAI 兼容中转，勿把已有千问改到这里。 */
  freellmapi: {
    baseUrl: "https://oa.api2d.net/v1",
    model: "gemini-2.5-pro",
    envKeys: ["FREELLMAPI_API_KEY"],
    baseUrlEnv: ["FREELLMAPI_BASE_URL"],
    modelEnv: ["FREELLMAPI_MODEL"],
  },
  /** 百度千帆（文心）。用百度发行的旗舰模型。 */
  baidu: {
    baseUrl: "https://qianfan.baidubce.com/v2",
    model: "ernie-5.0-thinking-preview",
    envKeys: ["QIANFAN_API_KEY", "BAIDU_API_KEY"],
    baseUrlEnv: ["QIANFAN_BASE_URL", "BAIDU_BASE_URL"],
    modelEnv: ["QIANFAN_MODEL", "BAIDU_MODEL"],
  },
  /**
   * Claude：官方 Anthropic 或 OpenAI 兼容中转（默认复用 API2D / FREELLMAPI）。
   * 优先 ANTHROPIC_API_KEY + ANTHROPIC_BASE_URL；否则走 FREELLMAPI_*。
   */
  anthropic: {
    baseUrl: "https://oa.api2d.net/v1",
    model: "claude-sonnet-4-20250514",
    envKeys: ["ANTHROPIC_API_KEY", "FREELLMAPI_API_KEY"],
    baseUrlEnv: ["ANTHROPIC_BASE_URL", "FREELLMAPI_BASE_URL"],
    modelEnv: ["ANTHROPIC_MODEL", "CLAUDE_MODEL"],
  },
  /**
   * 腾讯云 TokenHub（大模型服务平台，OpenAI 兼容）。
   * sk- 开头的 API KEY；不是经典云 API 的 SecretId/SecretKey，也不是本站 New API 网关令牌。
   * 默认真机：https://tokenhub.tencentmaas.com/v1 ；可用模型以 GET /v1/models 为准。
   */
  tokenhub: {
    baseUrl: "https://tokenhub.tencentmaas.com/v1",
    model: "hy3",
    envKeys: ["TOKENHUB_API_KEY", "HUNYUAN_API_KEY"],
    baseUrlEnv: ["TOKENHUB_BASE_URL", "HUNYUAN_BASE_URL"],
    modelEnv: ["TOKENHUB_MODEL", "HUNYUAN_MODEL"],
  },
} as const;

export type ProviderName = keyof typeof PROVIDERS;

export function getNamedProviderConfig(
  name: ProviderName,
  modelOverride?: string
): LlmConfig {
  const base = resolvePreset(PROVIDERS[name]);
  return {
    ...base,
    model: (modelOverride || base.model).trim(),
  };
}

export function getVisionRuntimeConfig(): LlmConfig | null {
  const model = env("QWEN_VL_MODEL") || "qwen-vl-plus";
  const qwen = getNamedProviderConfig("qwen", model);
  if (!qwen.apiKey) return null;
  // 保留 .env 里的 QWEN_BASE_URL（专用 MaaS）；勿强行改成公网百炼，否则专用 key 会报「无效的令牌」
  return {
    ...qwen,
    model,
  };
}

export function getVisionRuntimeConfigs(): LlmConfig[] {
  const direct = getVisionRuntimeConfig();
  if (!direct) return [];
  const publicDash = "https://dashscope.aliyuncs.com/compatible-mode/v1";
  const list: LlmConfig[] = [];
  const push = (cfg: LlmConfig) => {
    if (!cfg.apiKey) return;
    const exists = list.some(
      (row) =>
        row.baseUrl === cfg.baseUrl &&
        row.model === cfg.model &&
        row.apiKey === cfg.apiKey
    );
    if (!exists) list.push(cfg);
  };

  // 1) 配置的千问地址（生产多为 maas.aliyuncs.com）
  push(direct);
  // 2) 公网百炼兼容态（密钥若两边通用则可兜底）
  if (direct.baseUrl !== publicDash) {
    push({ ...direct, baseUrl: publicDash });
  }
  // 3) New API 网关最后试（模型名须网关已挂 VL）
  const gw = getGatewayOverride();
  if (gw && (gw.baseUrl !== direct.baseUrl || gw.apiKey !== direct.apiKey)) {
    push({
      baseUrl: gw.baseUrl,
      apiKey: gw.apiKey,
      model: direct.model,
    });
  }
  return list;
}

function env(name: string) {
  const runtimeProcess = (
    globalThis as typeof globalThis & {
      process?: { env?: Record<string, string | undefined> };
    }
  ).process;
  return (runtimeProcess?.env?.[name] || "").trim();
}

function trimSlash(url: string) {
  return url.replace(/\/+$/, "");
}

export function normalizeBaseUrl(input: string) {
  const raw = trimSlash(input.trim() || PROVIDERS.deepseek.baseUrl);
  if (/\/v\d+(\/|$)/i.test(raw)) return raw;
  return `${raw}/v1`;
}

export function chatTemperature(model: string, preferred = 0.6) {
  if (/kimi|k2\.|moonshot|thinking|reasoner|qwq|qwen3|deepseek-v4|gpt-5\.6/i.test(model)) {
    return 1;
  }
  return preferred;
}

export function shouldRetryTemperatureOne(detail: string, current: number) {
  return current !== 1 && /invalid temperature|only 1 is allowed/i.test(detail);
}

/** Prefer message.content; fall back to reasoning_content for reasoner models. */
export function extractAssistantText(data: unknown): string {
  const message = (
    data as {
      choices?: {
        message?: {
          content?: unknown;
          reasoning_content?: unknown;
        };
      }[];
    }
  )?.choices?.[0]?.message;
  if (!message) return "";

  const fromContent = normalizeAssistantPart(message.content);
  if (fromContent) return fromContent;

  const fromReasoning = normalizeAssistantPart(message.reasoning_content);
  if (!fromReasoning) return "";
  const split = fromReasoning.split(/\n{2,}|最终回答[:：]|答[：:]/);
  const tail = split[split.length - 1]?.trim();
  return (tail && tail.length >= 8 ? tail : fromReasoning).trim();
}

function normalizeAssistantPart(part: unknown): string {
  if (typeof part === "string") return part.trim();
  if (Array.isArray(part)) {
    return part
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && "text" in item) {
          return String((item as { text?: string }).text || "");
        }
        return "";
      })
      .join("")
      .trim();
  }
  return "";
}

export function chatCompletionMaxTokens(model: string, hasImages: boolean, reduced = false) {
  const reasoner = /deepseek-v4|reasoner|o3|o4|thinking|gpt-5\.6/i.test(model);
  if (reduced) return reasoner ? 800 : hasImages ? 600 : 400;
  if (reasoner) return hasImages ? 2200 : 1600;
  return hasImages ? 1200 : 800;
}

export function maskApiKey(key: string) {
  const value = key.trim();
  if (!value) return "";
  if (value.length <= 8) return "********";
  return `${value.slice(0, 4)}****${value.slice(-4)}`;
}

function firstEnvKey(names: readonly string[]) {
  for (const name of names) {
    const value = env(name);
    if (value) return value;
  }
  return "";
}

function resolvePreset(preset: (typeof PROVIDERS)[ProviderName]): LlmConfig {
  return {
    baseUrl: normalizeBaseUrl(firstEnvKey(preset.baseUrlEnv) || preset.baseUrl),
    apiKey: firstEnvKey(preset.envKeys),
    model: firstEnvKey(preset.modelEnv) || preset.model,
  };
}

function configFromEnv(): LlmConfig {
  const requested = env("LLM_PROVIDER").toLowerCase() as ProviderName | "";
  if (
    requested &&
    requested in PROVIDERS &&
    requested !== "freellmapi"
  ) {
    return resolvePreset(PROVIDERS[requested]);
  }

  for (const [name, preset] of Object.entries(PROVIDERS) as [
    ProviderName,
    (typeof PROVIDERS)[ProviderName],
  ][]) {
    if (name === "freellmapi" || name === "tokenhub") continue;
    const config = resolvePreset(preset);
    if (config.apiKey) return config;
  }

  return resolvePreset(PROVIDERS.deepseek);
}

/** API2D / FreeLLMAPI / 百度千帆 / TokenHub 等直连通道，不要被 new-api 网关覆盖。 */
function isDirectOnlyUpstream(cfg: LlmConfig) {
  const freellm = env("FREELLMAPI_BASE_URL");
  if (freellm && normalizeBaseUrl(freellm) === cfg.baseUrl) return true;
  const qianfan = env("QIANFAN_BASE_URL") || env("BAIDU_BASE_URL");
  if (qianfan && normalizeBaseUrl(qianfan) === cfg.baseUrl) return true;
  const tokenhub = env("TOKENHUB_BASE_URL") || env("HUNYUAN_BASE_URL");
  if (tokenhub && normalizeBaseUrl(tokenhub) === cfg.baseUrl) return true;
  if (/api2d\.net/i.test(cfg.baseUrl)) return true;
  if (/qianfan\.baidubce\.com/i.test(cfg.baseUrl)) return true;
  if (/tokenhub\.tencentmaas\.com/i.test(cfg.baseUrl)) return true;
  return /:3002(\/|$)/i.test(cfg.baseUrl);
}

function applyGateway(cfg: LlmConfig): LlmConfig {
  if (isDirectOnlyUpstream(cfg)) return cfg;
  const gw = getGatewayOverride();
  if (!gw) return cfg;
  return { ...cfg, baseUrl: gw.baseUrl, apiKey: gw.apiKey };
}

/** 网关优先，不通再直连。千问专用实例内存打满时，追加百炼公网。 */
export function liveConfigAttempts(direct: LlmConfig | null): LlmConfig[] {
  if (!direct) return [];
  if (!direct.apiKey && !isGatewayEnabled()) return [];
  const dashscope = "https://dashscope.aliyuncs.com/compatible-mode/v1";
  const list: LlmConfig[] = [];
  const push = (cfg: LlmConfig) => {
    const exists = list.some(
      (row) => row.baseUrl === cfg.baseUrl && row.model === cfg.model && row.apiKey === cfg.apiKey
    );
    if (!exists && cfg.apiKey) list.push(cfg);
  };

  const gateway = applyGateway(direct);
  const dedicatedMaaS = /maas\.aliyuncs\.com/i.test(direct.baseUrl);
  const publicQwen = dedicatedMaaS && direct.apiKey
    ? { ...direct, baseUrl: dashscope }
    : null;

  // 网关优先：本地/生产有 LLM_GATEWAY_* 时流量先打 New API，仪表盘才能有实时用量
  if (gateway.apiKey && (gateway.baseUrl !== direct.baseUrl || gateway.apiKey !== direct.apiKey)) {
    push(gateway);
  }
  if (publicQwen) push(publicQwen);
  if (direct.apiKey) push(direct);
  if (list.length === 0 && gateway.apiKey) push(gateway);
  return list;
}

export async function getLlmConfig(): Promise<LlmConfig> {
  const row = await prisma.platformConfig.findUnique({
    where: { id: "default" },
  });

  if (row?.apiKey?.trim()) {
    const fallback = configFromEnv();
    return applyGateway({
      baseUrl: normalizeBaseUrl(row.baseUrl || fallback.baseUrl),
      apiKey: row.apiKey.trim(),
      model: (row.model || fallback.model).trim(),
    });
  }

  return applyGateway(configFromEnv());
}
