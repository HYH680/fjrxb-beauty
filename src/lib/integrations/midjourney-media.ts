import { outboundFetch } from "@/lib/integrations/outbound-proxy";
import {
  probeSidecar,
  sidecarDownHint,
  sidecarUnreachable,
} from "@/lib/integrations/sidecar";

/**
 * Midjourney 出图：优先 TTAPI 公开网关（只需 API Key），其次自建 midjourney-proxy。
 * - TTAPI: https://docs.ttapi.io/ （GitHub/社区常用托管通道）
 * - midjourney-proxy: https://github.com/novicezk/midjourney-proxy
 * Midjourney 官方无公开 API；上述均为第三方/自建代理。
 */

/** 地址或网关密钥已写上（不代表代理进程已起来） */
export function midjourneyMediaEnabled() {
  if (preferProvider() === "proxy") return Boolean(proxyBase());
  if (preferProvider() === "ttapi") return Boolean(ttapiKey());
  return Boolean(ttapiKey() || proxyBase());
}

/** 货架「在线可用」：网关有 Key，或本机 proxy 探测通了 */
export async function midjourneyChannelLive() {
  const prefer = preferProvider();
  if (prefer === "ttapi") return Boolean(ttapiKey());
  if (prefer === "proxy") {
    const base = proxyBase();
    return base ? probeSidecar(base) : false;
  }
  if (ttapiKey()) return true;
  const base = proxyBase();
  return base ? probeSidecar(base) : false;
}

function ttapiKey() {
  return (
    process.env.TTAPI_API_KEY?.trim() ||
    process.env.MIDJOURNEY_API_KEY?.trim() ||
    ""
  );
}

function ttapiBase() {
  return (
    process.env.TTAPI_BASE_URL?.trim() ||
    "https://api.ttapi.io"
  ).replace(/\/$/, "");
}

function proxyBase() {
  const raw =
    process.env.MIDJOURNEY_PROXY_BASE?.trim() ||
    process.env.MIDJOURNEY_API_BASE?.trim() ||
    "";
  if (!raw) return "";
  return raw.replace(/\/$/, "");
}

function proxySecret() {
  return (
    process.env.MIDJOURNEY_API_SECRET?.trim() ||
    process.env.MJ_API_SECRET?.trim() ||
    ""
  );
}

function preferProvider(): "ttapi" | "proxy" | "auto" {
  const v = (process.env.MIDJOURNEY_PROVIDER || "proxy").trim().toLowerCase();
  if (v === "ttapi" || v === "proxy" || v === "auto") return v;
  return "proxy";
}

type ImageResult = {
  provider: "midjourney";
  model: string;
  b64: string;
  url: string;
  size: string;
  usedRef: boolean;
  jobId?: string;
  images?: string[];
  notice?: string;
};

async function generateViaTtapi(prompt: string): Promise<ImageResult> {
  const key = ttapiKey();
  if (!key) throw new Error("未配置 TTAPI_API_KEY / MIDJOURNEY_API_KEY");

  const mode = (process.env.MIDJOURNEY_MODE?.trim() || "fast").toLowerCase();
  const submit = await outboundFetch(`${ttapiBase()}/midjourney/v1/imagine`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "TT-API-KEY": key,
    },
    body: JSON.stringify({
      prompt: prompt.slice(0, 5000),
      mode: mode === "relax" || mode === "turbo" ? mode : "fast",
    }),
  });
  const submitText = await submit.text();
  let submitJson: {
    status?: string;
    message?: string;
    data?: { jobId?: string } | string;
    jobId?: string;
  } = {};
  try {
    submitJson = submitText ? JSON.parse(submitText) : {};
  } catch {
    /* ignore */
  }
  if (!submit.ok || String(submitJson.status || "").toUpperCase() === "FAILED") {
    throw new Error(
      submitJson.message ||
        submitText.slice(0, 240) ||
        `TTAPI Midjourney HTTP ${submit.status}`
    );
  }

  const jobId =
    (typeof submitJson.data === "object" && submitJson.data?.jobId) ||
    submitJson.jobId ||
    (typeof submitJson.data === "string" ? submitJson.data : "");
  if (!jobId) throw new Error("TTAPI 未返回 jobId");

  const started = Date.now();
  let delay = 3000;
  while (Date.now() - started < 240_000) {
    const fetchRes = await outboundFetch(
      `${ttapiBase()}/midjourney/v1/fetch?jobId=${encodeURIComponent(jobId)}`,
      {
        method: "GET",
        headers: { "TT-API-KEY": key },
      }
    );
    const fetchText = await fetchRes.text();
    let fetchJson: {
      status?: string;
      message?: string;
      data?: {
        progress?: string | number;
        status?: string;
        cdnImage?: string;
        discordImage?: string;
        images?: string[];
      };
    } = {};
    try {
      fetchJson = fetchText ? JSON.parse(fetchText) : {};
    } catch {
      /* ignore */
    }
    if (!fetchRes.ok) {
      throw new Error(
        fetchJson.message ||
          fetchText.slice(0, 240) ||
          `TTAPI fetch HTTP ${fetchRes.status}`
      );
    }

    const row = fetchJson.data || {};
    const progress = String(row.progress ?? "");
    const done =
      progress === "100" ||
      progress === "100%" ||
      String(row.status || "").toUpperCase() === "SUCCESS";
    const images = [
      ...(Array.isArray(row.images) ? row.images : []),
      row.cdnImage,
      row.discordImage,
    ].filter((u): u is string => Boolean(u));

    if (done && images.length > 0) {
      return {
        provider: "midjourney",
        model: `ttapi-mj-${mode}`,
        b64: "",
        url: images[0],
        size: "mj-grid",
        usedRef: false,
        jobId,
        images,
        notice: `Midjourney 出图完成（TTAPI，${images.length} 张）。`,
      };
    }

    const failed = String(fetchJson.status || row.status || "").toUpperCase();
    if (failed === "FAILED" || failed === "FAILURE") {
      throw new Error(fetchJson.message || "Midjourney 任务失败");
    }

    await new Promise((r) => setTimeout(r, delay));
    delay = Math.min(8000, Math.floor(delay * 1.2));
  }
  throw new Error("Midjourney 出图超时（TTAPI）");
}

async function generateViaProxy(prompt: string): Promise<ImageResult> {
  const base = proxyBase();
  if (!base) throw new Error("未配置 MIDJOURNEY_PROXY_BASE");
  const secret = proxySecret();
  const root = base.endsWith("/mj") ? base : `${base}/mj`;

  let submit: Response;
  try {
    submit = await outboundFetch(`${root}/submit/imagine`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(secret ? { "mj-api-secret": secret } : {}),
      },
      body: JSON.stringify({ prompt: prompt.slice(0, 5000) }),
    });
  } catch (error) {
    if (sidecarUnreachable(error)) throw new Error(sidecarDownHint("midjourney"));
    throw error;
  }
  const submitText = await submit.text();
  let submitJson: {
    code?: number;
    description?: string;
    result?: string;
    properties?: { imageUrl?: string };
  } = {};
  try {
    submitJson = submitText ? JSON.parse(submitText) : {};
  } catch {
    /* ignore */
  }
  if (!submit.ok || (submitJson.code !== 1 && submitJson.code !== 22 && submitJson.code !== 21)) {
    throw new Error(
      submitJson.description ||
        submitText.slice(0, 240) ||
        `midjourney-proxy HTTP ${submit.status}`
    );
  }

  if (submitJson.code === 21 && submitJson.properties?.imageUrl) {
    return {
      provider: "midjourney",
      model: "midjourney-proxy",
      b64: "",
      url: submitJson.properties.imageUrl,
      size: "mj-grid",
      usedRef: false,
      jobId: submitJson.result,
      images: [submitJson.properties.imageUrl],
      notice: "Midjourney 出图完成（proxy 命中已有任务）。",
    };
  }

  const taskId = submitJson.result;
  if (!taskId) throw new Error("midjourney-proxy 未返回任务 ID");

  const started = Date.now();
  let delay = 3000;
  while (Date.now() - started < 240_000) {
    const fetchRes = await outboundFetch(`${root}/task/${taskId}/fetch`, {
      method: "GET",
      headers: secret ? { "mj-api-secret": secret } : {},
    });
    const fetchText = await fetchRes.text();
    let task: {
      status?: string;
      progress?: string;
      imageUrl?: string;
      failReason?: string;
    } = {};
    try {
      task = fetchText ? JSON.parse(fetchText) : {};
    } catch {
      /* ignore */
    }
    if (!fetchRes.ok) {
      throw new Error(fetchText.slice(0, 240) || `proxy fetch ${fetchRes.status}`);
    }

    const status = (task.status || "").toUpperCase();
    if (status === "FAILURE") {
      throw new Error(task.failReason || "Midjourney 任务失败");
    }
    if (status === "SUCCESS" && task.imageUrl) {
      return {
        provider: "midjourney",
        model: "midjourney-proxy",
        b64: "",
        url: task.imageUrl,
        size: "mj-grid",
        usedRef: false,
        jobId: taskId,
        images: [task.imageUrl],
        notice: "Midjourney 出图完成（midjourney-proxy）。",
      };
    }

    await new Promise((r) => setTimeout(r, delay));
    delay = Math.min(8000, Math.floor(delay * 1.2));
  }
  throw new Error("Midjourney 出图超时（proxy）");
}

export async function generateImageMidjourney(input: {
  prompt: string;
}): Promise<ImageResult> {
  const prompt = input.prompt.trim();
  if (!prompt) throw new Error("需要 Midjourney 提示词");

  const prefer = preferProvider();
  const errors: string[] = [];

  const tryTtapi = async () => {
    if (!ttapiKey()) throw new Error("未配置 TTAPI_API_KEY");
    return generateViaTtapi(prompt);
  };
  const tryProxy = async () => {
    if (!proxyBase()) throw new Error("未配置 MIDJOURNEY_PROXY_BASE");
    return generateViaProxy(prompt);
  };

  if (prefer === "ttapi") return tryTtapi();
  if (prefer === "proxy") return tryProxy();

  if (ttapiKey()) {
    try {
      return await tryTtapi();
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
  }
  if (proxyBase()) {
    try {
      return await tryProxy();
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
  }

  throw new Error(
    errors.length
      ? `Midjourney 不可用：${errors.join("；")}`
      : "未配置 Midjourney：请自建 midjourney-proxy（MIDJOURNEY_PROXY_BASE）或填 TTAPI_API_KEY"
  );
}
