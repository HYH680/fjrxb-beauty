import { prisma } from "@/lib/prisma";

/** 账户页可点的实体开关（写入 DB，立即影响运行时） */
export const TOGGLEABLE_FEATURES = [
  "n8n",
  "localWhisper",
  "docling",
  "localLlmGateway",
] as const;

export type ToggleableFeature = (typeof TOGGLEABLE_FEATURES)[number];

export type IntegrationFlags = Partial<Record<ToggleableFeature, boolean>>;

const DEFAULT_URLS: Record<
  Exclude<ToggleableFeature, "localLlmGateway">,
  string
> = {
  n8n: "http://127.0.0.1:5678/webhook/ai-supermarket",
  localWhisper: "http://127.0.0.1:8091",
  docling: "http://127.0.0.1:8092",
};

function envFlag(name: string): boolean | null {
  const v = process.env[name]?.trim().toLowerCase();
  if (!v) return null;
  if (["0", "false", "off", "no"].includes(v)) return false;
  if (["1", "true", "on", "yes"].includes(v)) return true;
  return null;
}

function parseFlags(raw: string | null | undefined): IntegrationFlags {
  if (!raw?.trim()) return {};
  try {
    const data = JSON.parse(raw) as Record<string, unknown>;
    const out: IntegrationFlags = {};
    for (const key of TOGGLEABLE_FEATURES) {
      if (typeof data[key] === "boolean") out[key] = data[key];
    }
    return out;
  } catch {
    return {};
  }
}

export async function getStoredIntegrationFlags(): Promise<IntegrationFlags> {
  try {
    const row = await prisma.platformConfig.findUnique({
      where: { id: "default" },
      select: { integrationFlags: true },
    });
    const flags = parseFlags(row?.integrationFlags);
    memoryFlags = flags;
    return flags;
  } catch {
    return memoryFlags;
  }
}

/** 同步读缓存（供 getGatewayOverride 等热路径）；先被异步加载填充 */
let memoryFlags: IntegrationFlags = {};

export function getMemoryIntegrationFlags(): IntegrationFlags {
  return memoryFlags;
}

export async function setIntegrationFlag(
  id: ToggleableFeature,
  on: boolean
): Promise<IntegrationFlags> {
  if (!TOGGLEABLE_FEATURES.includes(id)) {
    throw new Error("该能力不可切换");
  }
  const current = await getStoredIntegrationFlags();
  const next: IntegrationFlags = { ...current, [id]: on };
  memoryFlags = next;

  await prisma.platformConfig.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      integrationFlags: JSON.stringify(next),
    },
    update: {
      integrationFlags: JSON.stringify(next),
    },
  });

  return next;
}

/**
 * 解析最终是否启用。
 * 优先级：DB 显式开关 > env FEATURE_* > 有 URL/KEY 即开（并可用默认本机地址）
 */
export async function resolveFeatureEnabled(
  id: ToggleableFeature
): Promise<boolean> {
  const stored = await getStoredIntegrationFlags();
  if (typeof stored[id] === "boolean") return stored[id]!;

  if (id === "n8n") {
    const f = envFlag("FEATURE_N8N");
    if (f !== null) return f;
    return Boolean(process.env.N8N_WEBHOOK_URL?.trim());
  }
  if (id === "localWhisper") {
    const f = envFlag("FEATURE_LOCAL_WHISPER");
    if (f !== null) return f;
    return Boolean(process.env.WHISPER_URL?.trim());
  }
  if (id === "docling") {
    const f = envFlag("FEATURE_DOCLING");
    if (f !== null) return f;
    return Boolean(
      process.env.DOCLING_URL?.trim() || process.env.MARKER_URL?.trim()
    );
  }
  // localLlmGateway
  const f = envFlag("FEATURE_LOCAL_LLM");
  if (f === false) return false;
  return Boolean(
    process.env.LLM_GATEWAY_BASE_URL?.trim() &&
      process.env.LLM_GATEWAY_API_KEY?.trim()
  );
}

/**
 * 旁路基址：仅服务端内部使用，不对前端暴露。
 * 开关打开 → 用内部默认（或 INTEGRATION_*_INTERNAL 覆盖）；关闭 → 空字符串。
 * 不再把 :5678/:8091/:8092 当作「网站地址」配置给用户。
 */
export async function resolveServiceBase(
  id: "n8n" | "localWhisper" | "docling"
): Promise<string> {
  const enabled = await resolveFeatureEnabled(id);
  if (!enabled) return "";

  if (id === "n8n") {
    return (
      process.env.INTEGRATION_N8N_INTERNAL?.trim() ||
      process.env.N8N_WEBHOOK_URL?.trim() ||
      DEFAULT_URLS.n8n
    );
  }
  if (id === "localWhisper") {
    return (
      process.env.INTEGRATION_WHISPER_INTERNAL?.trim() ||
      process.env.WHISPER_URL?.trim() ||
      DEFAULT_URLS.localWhisper
    );
  }
  return (
    process.env.INTEGRATION_DOCLING_INTERNAL?.trim() ||
    process.env.DOCLING_URL?.trim() ||
    process.env.MARKER_URL?.trim() ||
    DEFAULT_URLS.docling
  );
}

export function isToggleableFeature(id: string): id is ToggleableFeature {
  return (TOGGLEABLE_FEATURES as readonly string[]).includes(id);
}
