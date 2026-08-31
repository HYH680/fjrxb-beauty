/** 出图专用模型（与对话模型分开） */

export type ImageModelOption = {
  id: string;
  label: string;
  hint: string;
  provider: "qwen" | "openai" | "jimeng" | "midjourney" | "replicate";
  /** 传给上游的真实 model 名 */
  upstream: string;
  supportsRef: boolean;
};

export const IMAGE_MODELS: ImageModelOption[] = [
  {
    id: "wanx-v1",
    label: "万相标准（1K 默认）",
    hint: "千问万相，支持参考图",
    provider: "qwen",
    upstream: "wanx-v1",
    supportsRef: true,
  },
  {
    id: "wanx-v1-hq",
    label: "万相高质量",
    hint: "同万相通道，建议配 2K/4K",
    provider: "qwen",
    upstream: "wanx-v1",
    supportsRef: true,
  },
  {
    id: "jimeng-t2i",
    label: "即梦 4.0",
    hint: "火山引擎即梦文生图，偏国内创意/电商",
    provider: "jimeng",
    upstream: "jimeng_t2i_v40",
    supportsRef: false,
  },
  {
    id: "midjourney",
    label: "Midjourney（自建 proxy）",
    hint: "本机 midjourney-proxy，Discord 凭证只放代理里",
    provider: "midjourney",
    upstream: "midjourney",
    supportsRef: false,
  },
  {
    id: "flux-schnell",
    label: "FLUX Schnell（Replicate）",
    hint: "开源快速出图，走 Replicate 官方 API",
    provider: "replicate",
    upstream: "black-forest-labs/flux-schnell",
    supportsRef: false,
  },
  {
    id: "sdxl-replicate",
    label: "SDXL（Replicate）",
    hint: "开源 SDXL，走 Replicate 官方 API",
    provider: "replicate",
    upstream: "stability-ai/sdxl",
    supportsRef: false,
  },
];

export function imageModelsForProduct(productId?: string): ImageModelOption[] {
  if (productId === "midjourney-api") {
    return IMAGE_MODELS.filter((m) => m.provider === "midjourney");
  }
  if (productId === "replicate-api") {
    return IMAGE_MODELS.filter((m) => m.provider === "replicate");
  }
  return IMAGE_MODELS.filter(
    (m) =>
      m.provider === "qwen" || m.provider === "openai" || m.provider === "jimeng"
  );
}

export function getImageModel(
  id?: string | null,
  productId?: string
): ImageModelOption {
  const pool = imageModelsForProduct(productId);
  return (
    pool.find((m) => m.id === id) ||
    IMAGE_MODELS.find((m) => m.id === id) ||
    pool[0] ||
    IMAGE_MODELS[0]
  );
}

export function isValidImageModel(id: string) {
  return IMAGE_MODELS.some((m) => m.id === id);
}
