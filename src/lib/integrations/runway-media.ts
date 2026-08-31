import { outboundFetch } from "@/lib/integrations/outbound-proxy";

const RUNWAY_VERSION = "2024-11-06";

export type RunwayRatio = "1280:720" | "720:1280" | "960:960" | "1104:832" | "832:1104";

export function runwayMediaEnabled() {
  return Boolean(runwayApiKey());
}

function runwayApiKey() {
  return (
    process.env.RUNWAY_API_KEY?.trim() ||
    process.env.RUNWAYML_API_SECRET?.trim() ||
    ""
  );
}

function runwayBaseUrl() {
  return (
    process.env.RUNWAY_BASE_URL?.trim() ||
    "https://api.dev.runwayml.com"
  ).replace(/\/$/, "");
}

function defaultModel() {
  return (process.env.RUNWAY_MODEL?.trim() || "gen4.5").trim();
}

function headers() {
  const key = runwayApiKey();
  if (!key) throw new Error("未配置 RUNWAY_API_KEY，无法生成视频");
  return {
    Authorization: `Bearer ${key}`,
    "X-Runway-Version": RUNWAY_VERSION,
    "Content-Type": "application/json",
  };
}

type TaskPayload = {
  id?: string;
  status?: string;
  output?: string[] | string;
  failure?: string;
  failureCode?: string;
  progress?: number;
};

async function runwayJson(path: string, init?: RequestInit) {
  const res = await outboundFetch(`${runwayBaseUrl()}${path}`, {
    ...init,
    headers: {
      ...headers(),
      ...(init?.headers || {}),
    },
  });
  const text = await res.text();
  let data: TaskPayload & { error?: string; message?: string } = {};
  try {
    data = text ? (JSON.parse(text) as typeof data) : {};
  } catch {
    /* non-json */
  }
  if (!res.ok) {
    const msg =
      data.error ||
      data.message ||
      data.failure ||
      text.slice(0, 240) ||
      `Runway HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

async function waitForTask(taskId: string, timeoutMs = 240_000) {
  const started = Date.now();
  let delay = 2500;
  while (Date.now() - started < timeoutMs) {
    const task = await runwayJson(`/v1/tasks/${taskId}`, { method: "GET" });
    const status = String(task.status || "").toUpperCase();
    if (status === "SUCCEEDED") return task;
    if (status === "FAILED") {
      throw new Error(task.failure || task.failureCode || "Runway 生成失败");
    }
    await new Promise((r) => setTimeout(r, delay));
    delay = Math.min(delay + 500, 6000);
  }
  throw new Error("Runway 生成超时，请稍后在控制台查看任务或缩短时长再试");
}

function pickOutput(task: TaskPayload) {
  const out = task.output;
  if (Array.isArray(out) && typeof out[0] === "string" && out[0]) return out[0];
  if (typeof out === "string" && out) return out;
  throw new Error("Runway 任务完成但未返回视频地址");
}

export async function generateRunwayVideo(input: {
  prompt: string;
  /** data:image/... 或 https URL；有图走图生视频 */
  promptImage?: string;
  durationSec?: number;
  ratio?: RunwayRatio;
  model?: string;
}) {
  const prompt = input.prompt.trim();
  if (!prompt) throw new Error("需要视频描述");

  const duration = Math.min(10, Math.max(2, Math.round(input.durationSec || 5)));
  const ratio = input.ratio || "1280:720";
  const hasImage = Boolean(input.promptImage?.trim());
  const model =
    input.model?.trim() ||
    (hasImage
      ? process.env.RUNWAY_IMAGE_MODEL?.trim() || "gen4_turbo"
      : defaultModel());

  const body: Record<string, unknown> = {
    model,
    promptText: prompt.slice(0, 1000),
    ratio,
    duration,
  };

  const path = hasImage ? "/v1/image_to_video" : "/v1/text_to_video";
  if (hasImage) {
    body.promptImage = input.promptImage!.trim();
  }

  const created = await runwayJson(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
  const taskId = created.id;
  if (!taskId) throw new Error("Runway 未返回 task id");

  const done = await waitForTask(taskId);
  const videoUrl = pickOutput(done);

  return {
    provider: "runway" as const,
    model,
    taskId,
    videoUrl,
    duration,
    ratio,
    mode: hasImage ? ("image_to_video" as const) : ("text_to_video" as const),
    notice: "成片链接约 24–48 小时有效，请尽快下载保存。",
  };
}

export async function runwayOrganizationProbe() {
  return runwayJson("/v1/organization", { method: "GET" });
}
