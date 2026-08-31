import { outboundFetch } from "@/lib/integrations/outbound-proxy";
import {
  probeSidecar,
  sidecarDownHint,
  sidecarUnreachable,
} from "@/lib/integrations/sidecar";

/**
 * Suno 成曲
 * - gateway：sunoapi.org（本站填 SUNO_API_KEY）
 * - selfhost：自建 gcui-art/suno-api（Cookie 只放在代理容器；本站只填地址）
 *
 * 自建文档：docs/suno-mj-selfhost.md
 */

export type SunoMode = "gateway" | "selfhost";

export function sunoMode(): SunoMode {
  const v = (process.env.SUNO_PROVIDER || "").trim().toLowerCase();
  if (v === "selfhost" || v === "gcui" || v === "local") return "selfhost";
  if (v === "gateway" || v === "sunoapi") return "gateway";
  const base = (process.env.SUNO_BASE_URL || "").trim();
  if (
    base &&
    !/sunoapi\.org/i.test(base) &&
    /(localhost|127\.0\.0\.1|suno-api|:3001|:8000)/i.test(base)
  ) {
    return "selfhost";
  }
  // 未显式买网关时，默认自建 suno-api
  if (!sunoApiKey()) return "selfhost";
  return "gateway";
}

export function sunoMediaEnabled() {
  if (sunoMode() === "selfhost") {
    return Boolean(process.env.SUNO_BASE_URL?.trim());
  }
  return Boolean(sunoApiKey());
}

/** 货架「在线可用」：网关有 Key，或本机 suno-api 探测通了 */
export async function sunoChannelLive() {
  if (sunoMode() === "gateway") return Boolean(sunoApiKey());
  const base = process.env.SUNO_BASE_URL?.trim();
  return base ? probeSidecar(base.replace(/\/$/, "")) : false;
}

function sunoApiKey() {
  return (
    process.env.SUNO_API_KEY?.trim() ||
    process.env.SUNOAPI_API_KEY?.trim() ||
    ""
  );
}

function sunoBaseUrl() {
  const fallback =
    sunoMode() === "selfhost"
      ? "http://127.0.0.1:3001"
      : "https://api.sunoapi.org";
  return (process.env.SUNO_BASE_URL?.trim() || fallback).replace(/\/$/, "");
}

function sunoModel() {
  return (process.env.SUNO_MODEL?.trim() || "V4_5").trim();
}

function callbackUrl() {
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim()?.replace(/\/$/, "");
  return (
    process.env.SUNO_CALLBACK_URL?.trim() ||
    (site ? `${site}/api/runtime/media/suno-callback` : "") ||
    "https://example.com/suno-callback"
  );
}

type SunoTrack = {
  id?: string;
  audioUrl?: string;
  streamAudioUrl?: string;
  imageUrl?: string;
  title?: string;
  duration?: number;
};

type ApiEnvelope<T> = {
  code?: number;
  msg?: string;
  data?: T;
};

type GcuiClip = {
  id?: string;
  status?: string;
  title?: string;
  audio_url?: string;
  image_url?: string;
  duration?: number;
};

function resultShape(tracks: SunoTrack[], model: string, taskId: string) {
  const primary = tracks[0];
  const audioUrl = primary?.audioUrl || primary?.streamAudioUrl || "";
  if (!audioUrl) throw new Error("Suno 任务完成但未返回音频地址");
  return {
    provider: "suno" as const,
    model,
    taskId,
    audioUrl,
    streamAudioUrl: primary?.streamAudioUrl || "",
    imageUrl: primary?.imageUrl || "",
    title: primary?.title || "AI 配乐",
    durationSec: primary?.duration,
    tracks: tracks.map((t) => ({
      id: t.id || "",
      audioUrl: t.audioUrl || t.streamAudioUrl || "",
      imageUrl: t.imageUrl || "",
      title: t.title || "",
      duration: t.duration,
    })),
    notice: `Suno 成曲完成（${model}，共 ${tracks.length} 条）。`,
  };
}

/** —— sunoapi.org 网关 —— */
async function gatewayJson<T>(path: string, init?: RequestInit): Promise<T> {
  const key = sunoApiKey();
  if (!key) throw new Error("未配置 SUNO_API_KEY（网关模式）");
  const res = await outboundFetch(`${sunoBaseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const text = await res.text();
  let data: ApiEnvelope<T> = {};
  try {
    data = text ? (JSON.parse(text) as ApiEnvelope<T>) : {};
  } catch {
    /* non-json */
  }
  if (!res.ok || (typeof data.code === "number" && data.code !== 200)) {
    throw new Error(
      data.msg || text.slice(0, 240) || `Suno HTTP ${res.status}`
    );
  }
  if (data.data === undefined) {
    throw new Error(data.msg || "Suno 返回为空");
  }
  return data.data;
}

async function generateViaGateway(input: {
  prompt: string;
  instrumental: boolean;
  model: string;
  title?: string;
}) {
  const created = await gatewayJson<{ taskId?: string }>("/api/v1/generate", {
    method: "POST",
    body: JSON.stringify({
      customMode: false,
      instrumental: input.instrumental,
      model: input.model,
      callBackUrl: callbackUrl(),
      prompt: input.prompt,
    }),
  });
  const taskId = created.taskId;
  if (!taskId) throw new Error("Suno 未返回 taskId");

  const started = Date.now();
  let delay = 3000;
  while (Date.now() - started < 240_000) {
    const info = await gatewayJson<{
      status?: string;
      errorMessage?: string | null;
      response?: { sunoData?: SunoTrack[] };
    }>(`/api/v1/generate/record-info?taskId=${encodeURIComponent(taskId)}`, {
      method: "GET",
    });
    const status = (info.status || "").toUpperCase();
    if (
      status === "CREATE_TASK_FAILED" ||
      status === "GENERATE_AUDIO_FAILED" ||
      status === "SENSITIVE_WORD_ERROR" ||
      status === "CALLBACK_EXCEPTION"
    ) {
      throw new Error(info.errorMessage || `Suno 生成失败：${status}`);
    }
    const tracks = info.response?.sunoData || [];
    const ready = tracks.filter(
      (t) => Boolean(t.audioUrl) || Boolean(t.streamAudioUrl)
    );
    if (
      (status === "SUCCESS" || status === "FIRST_SUCCESS") &&
      ready.length > 0
    ) {
      return resultShape(ready, `gateway-${input.model}`, taskId);
    }
    await new Promise((r) => setTimeout(r, delay));
    delay = Math.min(8000, Math.floor(delay * 1.25));
  }
  throw new Error("Suno 成曲超时（网关）");
}

/** —— 自建 gcui-art/suno-api —— */
async function selfhostFetch(path: string, init?: RequestInit) {
  let res: Response;
  try {
    res = await outboundFetch(`${sunoBaseUrl()}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers || {}),
      },
    });
  } catch (error) {
    if (sidecarUnreachable(error)) throw new Error(sidecarDownHint("suno"));
    throw error;
  }
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    /* ignore */
  }
  if (!res.ok) {
    const msg =
      data && typeof data === "object" && "error" in data
        ? String((data as { error?: string }).error)
        : text.slice(0, 240);
    throw new Error(msg || `自建 Suno HTTP ${res.status}`);
  }
  return data;
}

async function generateViaSelfhost(input: {
  prompt: string;
  instrumental: boolean;
  title?: string;
}) {
  const created = (await selfhostFetch("/api/generate", {
    method: "POST",
    body: JSON.stringify({
      prompt: input.prompt,
      make_instrumental: input.instrumental,
      wait_audio: false,
    }),
  })) as GcuiClip[] | { error?: string };

  if (!Array.isArray(created) || created.length === 0) {
    throw new Error(
      (created as { error?: string })?.error ||
        "自建 Suno 未返回曲目（请确认 SUNO_COOKIE 仍有效）"
    );
  }

  const ids = created.map((c) => c.id).filter(Boolean).join(",");
  if (!ids) throw new Error("自建 Suno 未返回 clip id");

  const started = Date.now();
  let delay = 4000;
  while (Date.now() - started < 240_000) {
    const rows = (await selfhostFetch(`/api/get?ids=${encodeURIComponent(ids)}`, {
      method: "GET",
    })) as GcuiClip[];
    if (!Array.isArray(rows)) {
      throw new Error("自建 Suno /api/get 返回异常");
    }
    const ready = rows.filter(
      (r) =>
        Boolean(r.audio_url) &&
        (r.status === "streaming" ||
          r.status === "complete" ||
          r.status === "completed")
    );
    if (ready.length > 0) {
      const tracks: SunoTrack[] = ready.map((r) => ({
        id: r.id,
        audioUrl: r.audio_url,
        imageUrl: r.image_url,
        title: r.title || input.title,
        duration: r.duration,
      }));
      return resultShape(tracks, "selfhost-gcui", ids);
    }
    const failed = rows.some((r) =>
      /error|failed/i.test(String(r.status || ""))
    );
    if (failed) throw new Error("自建 Suno 生成失败，请检查 Cookie / 额度");

    await new Promise((r) => setTimeout(r, delay));
    delay = Math.min(10000, Math.floor(delay * 1.2));
  }
  throw new Error("Suno 成曲超时（自建）");
}

export async function generateSunoMusic(input: {
  prompt: string;
  title?: string;
  style?: string;
  instrumental?: boolean;
  model?: string;
}) {
  const prompt = input.prompt.trim().slice(0, 3000);
  if (!prompt) throw new Error("需要配乐描述");

  const instrumental = input.instrumental !== false;
  const model = input.model || sunoModel();
  const mode = sunoMode();

  if (mode === "selfhost") {
    return generateViaSelfhost({
      prompt,
      instrumental,
      title: input.title,
    });
  }

  return generateViaGateway({
    prompt,
    instrumental,
    model,
    title: input.title,
  });
}
