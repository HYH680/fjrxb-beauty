import { createHash, createHmac } from "crypto";
import { outboundFetch } from "@/lib/integrations/outbound-proxy";

const HOST = "visual.volcengineapi.com";
const ENDPOINT = `https://${HOST}`;
const REGION = "cn-north-1";
const SERVICE = "cv";
const VERSION = "2022-08-31";

export function jimengMediaEnabled() {
  return Boolean(jimengAccessKey() && jimengSecretKey());
}

function jimengAccessKey() {
  return (
    process.env.JIMENG_ACCESS_KEY_ID?.trim() ||
    process.env.VOLC_ACCESS_KEY_ID?.trim() ||
    process.env.VOLCENGINE_ACCESS_KEY_ID?.trim() ||
    ""
  );
}

function jimengSecretKey() {
  return (
    process.env.JIMENG_SECRET_ACCESS_KEY?.trim() ||
    process.env.VOLC_SECRET_ACCESS_KEY?.trim() ||
    process.env.VOLCENGINE_SECRET_ACCESS_KEY?.trim() ||
    ""
  );
}

function defaultImageReqKey() {
  return (process.env.JIMENG_IMAGE_REQ_KEY?.trim() || "jimeng_t2i_v40").trim();
}

function defaultVideoReqKey() {
  return (process.env.JIMENG_VIDEO_REQ_KEY?.trim() || "jimeng_t2v_v30").trim();
}

function sha256Hex(data: string | Buffer) {
  return createHash("sha256").update(data).digest("hex");
}

function hmac(key: Buffer | string, msg: string) {
  return createHmac("sha256", key).update(msg, "utf8").digest();
}

function signingKey(secret: string, dateStamp: string) {
  const kDate = hmac(secret, dateStamp);
  const kRegion = hmac(kDate, REGION);
  const kService = hmac(kRegion, SERVICE);
  return hmac(kService, "request");
}

async function volcVisualRequest(action: string, body: Record<string, unknown>) {
  const ak = jimengAccessKey();
  const sk = jimengSecretKey();
  if (!ak || !sk) throw new Error("未配置即梦 / 火山引擎 Access Key");

  const now = new Date();
  const xDate =
    now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const dateStamp = xDate.slice(0, 8);
  const payload = JSON.stringify(body);
  const payloadHash = sha256Hex(payload);
  const query = `Action=${action}&Version=${VERSION}`;
  const signedHeaders = "content-type;host;x-content-sha256;x-date";
  const canonicalHeaders =
    `content-type:application/json\n` +
    `host:${HOST}\n` +
    `x-content-sha256:${payloadHash}\n` +
    `x-date:${xDate}\n`;
  const canonicalRequest = [
    "POST",
    "/",
    query,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");
  const credentialScope = `${dateStamp}/${REGION}/${SERVICE}/request`;
  const stringToSign = [
    "HMAC-SHA256",
    xDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");
  const signature = createHmac("sha256", signingKey(sk, dateStamp))
    .update(stringToSign, "utf8")
    .digest("hex");
  const authorization =
    `HMAC-SHA256 Credential=${ak}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const res = await outboundFetch(`${ENDPOINT}?${query}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Host: HOST,
      "X-Date": xDate,
      "X-Content-Sha256": payloadHash,
      Authorization: authorization,
    },
    body: payload,
  });
  const text = await res.text();
  let data: {
    code?: number;
    message?: string;
    data?: Record<string, unknown>;
  } = {};
  try {
    data = text ? (JSON.parse(text) as typeof data) : {};
  } catch {
    /* non-json */
  }
  if (!res.ok || (typeof data.code === "number" && data.code !== 10000)) {
    const msg = data.message || text.slice(0, 240) || `即梦 HTTP ${res.status}`;
    if (/not activate|未开通|Access Denied|NoPermission|403/i.test(msg)) {
      throw new Error(
        "即梦服务未开通或密钥无权限：请在火山引擎控制台开通「即梦AI-图片生成」后再试"
      );
    }
    throw new Error(msg);
  }
  return data;
}

function parseSize(size?: string) {
  if (size?.includes("*")) {
    const [w, h] = size.split("*").map((n) => Number(n));
    if (w && h) return { width: w, height: h };
  }
  if (size?.includes("x")) {
    const [w, h] = size.split("x").map((n) => Number(n));
    if (w && h) return { width: w, height: h };
  }
  return { width: 1024, height: 1024 };
}

async function waitImageResult(reqKey: string, taskId: string) {
  const started = Date.now();
  let delay = 3000;
  while (Date.now() - started < 180_000) {
    const env = await volcVisualRequest("CVGetResult", {
      req_key: reqKey,
      task_id: taskId,
    }).catch(async () =>
      volcVisualRequest("CVSync2AsyncGetResult", {
        req_key: reqKey,
        task_id: taskId,
      })
    );
    const row = (env.data || {}) as {
      status?: string;
      image_urls?: string[];
      binary_data_base64?: string[];
    };
    const status = String(row.status || "").toLowerCase();
    if (status === "done") return row;
    if (status === "not_found" || status === "expired" || status === "failed") {
      throw new Error(env.message || `即梦出图失败：${status || "unknown"}`);
    }
    await new Promise((r) => setTimeout(r, delay));
    delay = Math.min(delay + 500, 6000);
  }
  throw new Error("即梦出图超时，请稍后重试");
}

export async function generateImageJimeng(input: {
  prompt: string;
  size?: string;
  reqKey?: string;
}) {
  const prompt = input.prompt.trim();
  if (!prompt) throw new Error("需要出图提示词");
  const reqKey = input.reqKey?.trim() || defaultImageReqKey();
  const { width, height } = parseSize(input.size);

  const created = await volcVisualRequest("CVSync2AsyncSubmitTask", {
    req_key: reqKey,
    prompt: prompt.slice(0, 800),
    width,
    height,
  });
  const taskId = String(
    (created.data as { task_id?: string } | undefined)?.task_id || ""
  );
  if (!taskId) throw new Error("即梦未返回 task_id");

  const done = await waitImageResult(reqKey, taskId);
  const url = done.image_urls?.find(Boolean) || "";
  let b64 = done.binary_data_base64?.find(Boolean) || "";
  if (!b64 && url) {
    try {
      const imgRes = await fetch(url);
      if (imgRes.ok) {
        b64 = Buffer.from(await imgRes.arrayBuffer()).toString("base64");
      }
    } catch {
      /* url still usable */
    }
  }
  if (!url && !b64) throw new Error("即梦任务完成但未返回图片");

  return {
    provider: "jimeng" as const,
    model: reqKey,
    url,
    b64,
    size: `${width}x${height}`,
    usedRef: false,
    taskId,
  };
}

export async function generateVideoJimeng(input: {
  prompt: string;
  aspectRatio?: string;
  durationSec?: number;
  promptImage?: string;
  reqKey?: string;
}) {
  const prompt = input.prompt.trim();
  if (!prompt) throw new Error("需要视频描述");
  const hasImage = Boolean(input.promptImage?.trim());
  const reqKey =
    input.reqKey?.trim() ||
    (hasImage
      ? process.env.JIMENG_I2V_REQ_KEY?.trim() || "jimeng_i2v_first_v30"
      : defaultVideoReqKey());
  const frames = input.durationSec && input.durationSec >= 8 ? 241 : 121;
  const body: Record<string, unknown> = {
    req_key: reqKey,
    prompt: prompt.slice(0, 800),
    frames,
    seed: -1,
  };
  if (hasImage) {
    const img = input.promptImage!.trim();
    if (img.startsWith("data:image/")) {
      body.binary_data_base64 = [img.replace(/^data:image\/\w+;base64,/, "")];
    } else {
      body.image_urls = [img];
    }
  } else {
    body.aspect_ratio = input.aspectRatio || "16:9";
  }

  const created = await volcVisualRequest("CVSync2AsyncSubmitTask", body);
  const taskId = String(
    (created.data as { task_id?: string } | undefined)?.task_id || ""
  );
  if (!taskId) throw new Error("即梦未返回 task_id");

  const started = Date.now();
  let delay = 4000;
  while (Date.now() - started < 360_000) {
    const env = await volcVisualRequest("CVSync2AsyncGetResult", {
      req_key: reqKey,
      task_id: taskId,
    });
    const row = (env.data || {}) as {
      status?: string;
      video_url?: string;
    };
    const status = String(row.status || "").toLowerCase();
    if (status === "done") {
      const videoUrl = row.video_url || "";
      if (!videoUrl) throw new Error("即梦成片完成但未返回视频地址");
      return {
        provider: "jimeng" as const,
        model: reqKey,
        taskId,
        videoUrl,
        duration: frames === 241 ? 10 : 5,
        ratio: String(body.aspect_ratio || "16:9"),
        mode: hasImage
          ? ("image_to_video" as const)
          : ("text_to_video" as const),
        notice: "即梦成片链接时效较短，请尽快下载保存。",
      };
    }
    if (status === "failed" || status === "expired" || status === "not_found") {
      throw new Error(env.message || `即梦成片失败：${status}`);
    }
    await new Promise((r) => setTimeout(r, delay));
    delay = Math.min(delay + 500, 8000);
  }
  throw new Error("即梦成片超时，请稍后重试");
}
