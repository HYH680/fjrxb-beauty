/**
 * 旁路能力状态：DB 实体开关 + env；账户页展示开/关差异。
 */

import {
  getStoredIntegrationFlags,
  resolveFeatureEnabled,
  resolveServiceBase,
  TOGGLEABLE_FEATURES,
  type ToggleableFeature,
} from "@/lib/integrations/feature-flags";
import { jimengMediaEnabled } from "@/lib/integrations/jimeng-media";

export type CapabilityId =
  | "n8n"
  | "localWhisper"
  | "cloudAsr"
  | "docling"
  | "builtinPdf"
  | "localLlmGateway"
  | "cloudImageTts"
  | "langfuse"
  | "email";

export type CapabilityRow = {
  id: CapabilityId;
  track: "1-n8n" | "2-local-heavy" | "3-compose-align" | "base";
  label: string;
  on: boolean;
  switches: string[];
  whenOn: string;
  whenOff: string;
  live?: "up" | "down" | "skip";
  /** 管理员可在账户页一键切换 */
  toggleable?: boolean;
};

function on(v?: string | null) {
  return Boolean(v?.trim());
}

async function probe(
  url: string | undefined,
  path = "/health",
  ms = 700
): Promise<"up" | "down" | "skip"> {
  if (!url?.trim()) return "skip";
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(`${url.replace(/\/$/, "")}${path}`, {
      signal: ctrl.signal,
    });
    return res.ok ? "up" : "down";
  } catch {
    return "down";
  } finally {
    clearTimeout(t);
  }
}

export async function getIntegrationCapabilities(options?: {
  probeLive?: boolean;
}): Promise<CapabilityRow[]> {
  const probeLive = options?.probeLive !== false;
  const stored = await getStoredIntegrationFlags();

  const n8nOn = await resolveFeatureEnabled("n8n");
  const whisperOn = await resolveFeatureEnabled("localWhisper");
  const doclingOn = await resolveFeatureEnabled("docling");
  const gatewayOn = await resolveFeatureEnabled("localLlmGateway");

  const n8nUrl = n8nOn ? await resolveServiceBase("n8n") : "";
  const whisperUrl = whisperOn ? await resolveServiceBase("localWhisper") : "";
  const doclingUrl = doclingOn ? await resolveServiceBase("docling") : "";

  const qwen = on(process.env.QWEN_API_KEY);
  const openai = on(process.env.OPENAI_API_KEY);
  const jimeng = jimengMediaEnabled();
  const eleven = on(process.env.ELEVENLABS_API_KEY);

  const [n8nLive, whisperLive, doclingLive] = probeLive
    ? await Promise.all([
        n8nOn
          ? probe(
              n8nUrl.replace(/\/webhook\/.*$/, "") || "http://127.0.0.1:5678",
              "/",
              600
            ).then((s) =>
              s === "down" ? probe("http://127.0.0.1:5678", "/", 600) : s
            )
          : Promise.resolve("skip" as const),
        whisperOn ? probe(whisperUrl, "/health") : Promise.resolve("skip" as const),
        doclingOn ? probe(doclingUrl, "/health") : Promise.resolve("skip" as const),
      ])
    : (["skip", "skip", "skip"] as const);

  const toggleHint = (id: ToggleableFeature) =>
    typeof stored[id] === "boolean"
      ? `账户开关已${stored[id] ? "打开" : "关闭"}`
      : "尚未点过账户开关（跟 env）";

  const rows: CapabilityRow[] = [
    {
      id: "n8n",
      track: "1-n8n",
      label: "n8n 编排（出站 webhook）",
      on: n8nOn,
      toggleable: true,
      switches: ["总闸开关", "FEATURE_N8N", toggleHint("n8n")],
      whenOn:
        "开：经本站 API 内部走编排旁路（用户无需打开其它地址）",
      whenOff: "仍可用站内 /api/jobs；不会推外部编排",
      live: n8nLive,
    },
    {
      id: "localWhisper",
      track: "2-local-heavy",
      label: "本机 Whisper 转写",
      on: whisperOn,
      toggleable: true,
      switches: [
        "总闸开关",
        "FEATURE_LOCAL_WHISPER",
        toggleHint("localWhisper"),
      ],
      whenOn: "开：转写优先内部旁路；不可达时自动千问 ASR",
      whenOff: "只用千问 ASR / OpenAI，工作台按钮不变",
      live: whisperLive,
    },
    {
      id: "cloudAsr",
      track: "base",
      label: "云端转写（千问 ASR）",
      on: qwen || openai,
      switches: ["QWEN_API_KEY", "DASHSCOPE_ASR_MODEL", "OPENAI_API_KEY"],
      whenOn: "无本机 Whisper 或旁路挂了也能转写",
      whenOff: "转写依赖本机 Whisper",
    },
    {
      id: "docling",
      track: "2-local-heavy",
      label: "重型文档抽字（Docling 旁路）",
      on: doclingOn,
      toggleable: true,
      switches: [
        "总闸开关",
        "FEATURE_DOCLING",
        toggleHint("docling"),
      ],
      whenOn: "开：PDF 优先内部旁路；不可达时回落 unpdf",
      whenOff: "只用站内 unpdf",
      live: doclingLive,
    },
    {
      id: "builtinPdf",
      track: "base",
      label: "内置 PDF 抽字（unpdf）",
      on: true,
      switches: ["（始终可用）"],
      whenOn: "不启旁路也能审合同、抽正文",
      whenOff: "不会关闭",
    },
    {
      id: "localLlmGateway",
      track: "2-local-heavy",
      label: "本地/网关大模型（New API）",
      on: gatewayOn,
      toggleable: true,
      switches: [
        "账户开关",
        "FEATURE_LOCAL_LLM",
        "LLM_GATEWAY_BASE_URL",
        toggleHint("localLlmGateway"),
      ],
      whenOn: "对话走网关（需已配置 LLM_GATEWAY_*）",
      whenOff: "直连各云厂商 KEY",
      live:
        gatewayOn && on(process.env.LLM_GATEWAY_BASE_URL)
          ? await probe(process.env.LLM_GATEWAY_BASE_URL, "/health", 600).catch(
              () => "down" as const
            )
          : "skip",
    },
    {
      id: "cloudImageTts",
      track: "base",
      label: "出图 / 配音（云）",
      on: qwen || jimeng || eleven,
      switches: ["QWEN_API_KEY", "即梦 AK/SK", "ELEVENLABS_API_KEY"],
      whenOn: "工作台「专用能力」可出图、配音",
      whenOff: "专用按钮会提示未配置",
    },
    {
      id: "langfuse",
      track: "3-compose-align",
      label: "Langfuse 可观测",
      on:
        on(process.env.LANGFUSE_PUBLIC_KEY) &&
        on(process.env.LANGFUSE_SECRET_KEY),
      switches: ["LANGFUSE_PUBLIC_KEY", "LANGFUSE_SECRET_KEY"],
      whenOn: "调用链路同步到 Langfuse",
      whenOff: "仅本地 UsageEvent",
    },
    {
      id: "email",
      track: "base",
      label: "邮件（重置密码等）",
      on:
        on(process.env.RESEND_API_KEY) ||
        on(process.env.SMTP_HOST) ||
        process.env.NODE_ENV === "development",
      switches: ["RESEND_API_KEY", "SMTP_HOST"],
      whenOn: "可发真实邮件（开发态可降级提示）",
      whenOff: "生产重置密码不可用",
    },
  ];

  return rows;
}

export function capabilitiesToLegacyFlags(rows: CapabilityRow[]) {
  const map = Object.fromEntries(rows.map((r) => [r.id, r.on]));
  return {
    n8n: Boolean(map.n8n),
    whisper: Boolean(map.localWhisper || map.cloudAsr),
    localWhisper: Boolean(map.localWhisper),
    docling: Boolean(map.docling),
    image: Boolean(map.cloudImageTts),
    tts: Boolean(map.cloudImageTts),
    langfuse: Boolean(map.langfuse),
    email: Boolean(map.email),
    localLlmGateway: Boolean(map.localLlmGateway),
  };
}

export { TOGGLEABLE_FEATURES };
