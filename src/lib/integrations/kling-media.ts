import { SignJWT } from "jose";
import { outboundFetch } from "@/lib/integrations/outbound-proxy";

export type KlingAspect = "16:9" | "9:16" | "1:1";
export type KlingMode = "std" | "pro";

/** 国内开放平台多为 Bearer 单钥；国际站为 AK/SK 签 JWT */
export function klingMediaEnabled() {
  return Boolean(klingBearerKey() || (klingAccessKey() && klingSecretKey()));
}

function klingBearerKey() {
  return process.env.KLING_API_KEY?.trim() || "";
}

function klingAccessKey() {
  return (
    process.env.KLING_ACCESS_KEY?.trim() ||
    process.env.KLING_ACCESS_KEY_ID?.trim() ||
    ""
  );
}

function klingSecretKey() {
  return (
    process.env.KLING_SECRET_KEY?.trim() ||
    process.env.KLING_ACCESS_KEY_SECRET?.trim() ||
    ""
  );
}

function klingBaseUrl() {
  return (
    process.env.KLING_BASE_URL?.trim() ||
    "https://api-beijing.klingai.com"
  ).replace(/\/$/, "");
}

function defaultModel() {
  return (process.env.KLING_MODEL?.trim() || "kling-v1").trim();
}

async function authHeader() {
  const bearer = klingBearerKey();
  if (bearer) return `Bearer ${bearer}`;

  const ak = klingAccessKey();
  const sk = klingSecretKey();
  if (!ak || !sk) throw new Error("未配置 KLING_API_KEY 或 KLING_ACCESS_KEY/SECRET");

  const now = Math.floor(Date.now() / 1000);
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(ak)
    .setNotBefore(now - 5)
    .setExpirationTime(now + 1800)
    .sign(new TextEncoder().encode(sk));
  return `Bearer ${token}`;
}

type KlingEnvelope = {
  code?: number;
  message?: string;
  request_id?: string;
  data?: {
    task_id?: string;
    task_status?: string;
    task_status_msg?: string;
    task_result?: {
      videos?: { id?: string; url?: string; duration?: string }[];
    };
  };
};

async function klingJson(path: string, init?: RequestInit) {
  const res = await outboundFetch(`${klingBaseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: await authHeader(),
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const text = await res.text();
  let data: KlingEnvelope = {};
  try {
    data = text ? (JSON.parse(text) as KlingEnvelope) : {};
  } catch {
    /* non-json */
  }
  const businessCode = typeof data.code === "number" ? data.code : 0;
  if (!res.ok || (businessCode !== 0 && data.data == null)) {
    const msg =
      data.message ||
      text.slice(0, 240) ||
      `可灵 HTTP ${res.status}`;
    if (/balance|余额|not enough|1102/i.test(msg) || businessCode === 1102) {
      throw new Error("可灵账户余额不足，请到开放平台充值后再试");
    }
    throw new Error(msg);
  }
  return data;
}

async function waitForTask(
  kind: "text2video" | "image2video",
  taskId: string,
  timeoutMs = 360_000
) {
  const started = Date.now();
  let delay = 3000;
  while (Date.now() - started < timeoutMs) {
    const env = await klingJson(`/v1/videos/${kind}/${taskId}`, {
      method: "GET",
    });
    const status = String(env.data?.task_status || "").toLowerCase();
    if (status === "succeed") return env;
    if (status === "failed") {
      throw new Error(
        env.data?.task_status_msg || env.message || "可灵生成失败"
      );
    }
    await new Promise((r) => setTimeout(r, delay));
    delay = Math.min(delay + 500, 8000);
  }
  throw new Error("可灵生成超时，请稍后在控制台查看任务或缩短时长再试");
}

function pickVideoUrl(env: KlingEnvelope) {
  const url = env.data?.task_result?.videos?.find((v) => v.url)?.url || "";
  if (!url) throw new Error("可灵任务完成但未返回视频地址");
  return url;
}

export function runwayRatioToKling(ratio?: string): KlingAspect {
  if (ratio === "720:1280" || ratio === "9:16") return "9:16";
  if (ratio === "960:960" || ratio === "1:1") return "1:1";
  return "16:9";
}

export async function generateKlingVideo(input: {
  prompt: string;
  /** data:image/... 或 https URL；有图走图生视频 */
  promptImage?: string;
  durationSec?: number;
  aspectRatio?: KlingAspect;
  mode?: KlingMode;
  model?: string;
}) {
  const prompt = input.prompt.trim();
  if (!prompt) throw new Error("需要视频描述");

  const durationSec = input.durationSec && input.durationSec >= 8 ? 10 : 5;
  const duration = String(durationSec) as "5" | "10";
  const aspect_ratio = input.aspectRatio || "16:9";
  const mode = input.mode || "std";
  const hasImage = Boolean(input.promptImage?.trim());
  const model = input.model?.trim() || defaultModel();

  const body: Record<string, unknown> = {
    model_name: model,
    prompt: prompt.slice(0, 2500),
    duration,
    mode,
  };

  const kind: "text2video" | "image2video" = hasImage
    ? "image2video"
    : "text2video";
  if (hasImage) {
    body.image = input.promptImage!.trim();
  } else {
    body.aspect_ratio = aspect_ratio;
  }

  const created = await klingJson(`/v1/videos/${kind}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  const taskId = created.data?.task_id;
  if (!taskId) throw new Error("可灵未返回 task_id");

  const done = await waitForTask(kind, taskId);
  const videoUrl = pickVideoUrl(done);

  return {
    provider: "kling" as const,
    model,
    taskId,
    videoUrl,
    duration: durationSec,
    ratio: aspect_ratio,
    mode: kind,
    notice: "可灵成片链接时效较短，请尽快下载保存。",
  };
}
