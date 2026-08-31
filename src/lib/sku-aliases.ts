/** 已下架或改名的 SKU：旧网址跳到还在卖的那一张 */
export const SKU_ALIASES: Record<string, string> = {
  "dall-e-3": "ai-image-make",
  "stable-diffusion-xl": "ai-image-make",
  "copy-to-image": "ai-image-make",
  "ecommerce-image": "ai-image-make",
  "weaviate-cloud": "pinecone",
  "kling-video": "runway-gen3",
  "deepseek-chat": "qwen-plus",
};

export function canonicalSkuId(id: string) {
  return SKU_ALIASES[id] || id;
}
