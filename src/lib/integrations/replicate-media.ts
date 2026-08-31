import { outboundFetch } from "@/lib/integrations/outbound-proxy";

/**
 * Replicate 官方 Predictions API（开源模型托管，不是方案陪跑）。
 * https://replicate.com/docs/reference/http
 */

export function replicateMediaEnabled() {
  return replicatePublicEnabled() && Boolean(replicateToken());
}

export function replicatePublicEnabled() {
  const raw = (process.env.REPLICATE_PUBLIC_ENABLED || "").trim().toLowerCase();
  return !(raw === "0" || raw === "false" || raw === "off");
}

function replicateToken() {
  return (
    process.env.REPLICATE_API_TOKEN?.trim() ||
    process.env.REPLICATE_API_KEY?.trim() ||
    ""
  );
}

function replicateModel() {
  return (
    process.env.REPLICATE_MODEL?.trim() ||
    "black-forest-labs/flux-schnell"
  ).replace(/^\/+|\/+$/g, "");
}

type ImageResult = {
  provider: "replicate";
  model: string;
  b64: string;
  url: string;
  size: string;
  usedRef: boolean;
  jobId?: string;
  images?: string[];
  notice?: string;
};

type Prediction = {
  id?: string;
  status?: string;
  output?: unknown;
  error?: string | null;
  urls?: { get?: string };
};

function extractUrls(output: unknown): string[] {
  if (!output) return [];
  if (typeof output === "string" && /^https?:\/\//i.test(output)) {
    return [output];
  }
  if (Array.isArray(output)) {
    return output.flatMap((item) => extractUrls(item));
  }
  if (typeof output === "object") {
    const rec = output as Record<string, unknown>;
    for (const key of ["url", "image", "image_url"]) {
      const v = rec[key];
      if (typeof v === "string" && /^https?:\/\//i.test(v)) return [v];
    }
  }
  return [];
}

async function readPrediction(res: Response): Promise<Prediction> {
  const text = await res.text();
  let json: Prediction = {};
  try {
    json = text ? (JSON.parse(text) as Prediction) : {};
  } catch {
    /* ignore */
  }
  if (!res.ok) {
    throw new Error(
      json.error || text.slice(0, 240) || `Replicate HTTP ${res.status}`
    );
  }
  return json;
}

export async function generateImageReplicate(input: {
  prompt: string;
  model?: string;
}): Promise<ImageResult> {
  const token = replicateToken();
  if (!token) throw new Error("未配置 REPLICATE_API_TOKEN");

  const prompt = input.prompt.trim();
  if (!prompt) throw new Error("需要提示词");

  const model = (input.model?.trim() || replicateModel()).replace(
    /^\/+|\/+$/g,
    ""
  );
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Prefer: "wait=60",
  };

  const submit = await outboundFetch(
    `https://api.replicate.com/v1/models/${model}/predictions`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        input: {
          prompt: prompt.slice(0, 4000),
          aspect_ratio: "1:1",
          output_format: "png",
        },
      }),
    }
  );
  let pred = await readPrediction(submit);

  const started = Date.now();
  let delay = 1500;
  while (
    pred.status === "starting" ||
    pred.status === "processing" ||
    pred.status === "queued"
  ) {
    if (Date.now() - started > 180_000) {
      throw new Error("Replicate 出图超时");
    }
    const getUrl = pred.urls?.get;
    if (!getUrl) throw new Error("Replicate 未返回轮询地址");
    await new Promise((r) => setTimeout(r, delay));
    delay = Math.min(6000, Math.floor(delay * 1.25));
    const poll = await outboundFetch(getUrl, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
    pred = await readPrediction(poll);
  }

  if (pred.status === "failed" || pred.status === "canceled") {
    throw new Error(pred.error || `Replicate 任务 ${pred.status}`);
  }

  const images = extractUrls(pred.output);
  if (!images.length) {
    throw new Error("Replicate 未返回图片地址");
  }

  return {
    provider: "replicate",
    model,
    b64: "",
    url: images[0],
    size: "replicate",
    usedRef: false,
    jobId: pred.id,
    images,
    notice: `Replicate 出图完成（${model}）。`,
  };
}
