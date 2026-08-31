/** 作图工作台：比例 / 分辨率 / 场景细分（对齐 17yai 一类专业出图流程） */

export type AspectRatioId =
  | "1:1"
  | "2:3"
  | "3:2"
  | "3:4"
  | "4:3"
  | "4:5"
  | "5:4"
  | "9:16"
  | "16:9";

export type ResTierId = "1k" | "2k" | "4k";

export type StudioMode = "general" | "product" | "video";

export const ASPECT_RATIOS: {
  id: AspectRatioId;
  label: string;
  w: number;
  h: number;
}[] = [
  { id: "1:1", label: "1:1", w: 1, h: 1 },
  { id: "2:3", label: "2:3", w: 2, h: 3 },
  { id: "3:2", label: "3:2", w: 3, h: 2 },
  { id: "3:4", label: "3:4", w: 3, h: 4 },
  { id: "4:3", label: "4:3", w: 4, h: 3 },
  { id: "4:5", label: "4:5", w: 4, h: 5 },
  { id: "5:4", label: "5:4", w: 5, h: 4 },
  { id: "9:16", label: "9:16", w: 9, h: 16 },
  { id: "16:9", label: "16:9", w: 16, h: 9 },
];

export const RES_TIERS: {
  id: ResTierId;
  label: string;
  hint: string;
  longEdge: number;
}[] = [
  { id: "1k", label: "1K 快速预览", hint: "约 1024 边", longEdge: 1024 },
  { id: "2k", label: "2K 高质量", hint: "约 1440 边", longEdge: 1440 },
  { id: "4k", label: "4K 专业级", hint: "约 2048 边", longEdge: 2048 },
];

export type ScenePreset = {
  id: string;
  label: string;
  hint: string;
  /** 拼进提示词的专业约束 */
  promptBoost: string;
  preferredAspect?: AspectRatioId;
};

export const GENERAL_SCENES: ScenePreset[] = [
  {
    id: "poster",
    label: "海报",
    hint: "活动/品牌",
    promptBoost: "商业海报构图，主视觉清晰，留白可放标题，印刷感，高对比",
    preferredAspect: "3:4",
  },
  {
    id: "social-square",
    label: "社媒方图",
    hint: "朋友圈/小红书",
    promptBoost: "社交媒体方图，主体居中，干净背景，适合手机浏览",
    preferredAspect: "1:1",
  },
  {
    id: "story",
    label: "竖版故事",
    hint: "短视频封面",
    promptBoost: "竖版故事封面，上三分之一可叠字，画面有纵深",
    preferredAspect: "9:16",
  },
  {
    id: "banner",
    label: "横幅 Banner",
    hint: "网页头图",
    promptBoost: "横向 Banner，左右构图，主体偏一侧，适合叠文案",
    preferredAspect: "16:9",
  },
];

export const PRODUCT_SCENES: ScenePreset[] = [
  {
    id: "white-main",
    label: "白底主图",
    hint: "电商首图",
    promptBoost:
      "电商白底主图，纯白或浅灰无缝背景，商品居中完整入镜，边缘干净，无水印无logo叠字，商业摄影灯光",
    preferredAspect: "1:1",
  },
  {
    id: "scene",
    label: "场景图",
    hint: "使用情境",
    promptBoost:
      "商品场景图，真实使用环境，自然光，突出卖点与材质，不要杂乱背景",
    preferredAspect: "4:5",
  },
  {
    id: "detail-hero",
    label: "详情首图",
    hint: "详情页顶部",
    promptBoost: "详情页首图，商品特写+卖点氛围，构图适合竖滑详情，留标题区",
    preferredAspect: "3:4",
  },
  {
    id: "selling-points",
    label: "卖点拼图",
    hint: "多点展示",
    promptBoost:
      "商品卖点拼图式构图，主体清晰，可分区域展示材质/尺寸/功能，信息层级清楚",
    preferredAspect: "1:1",
  },
  {
    id: "amazon-main",
    label: "Amazon 主图",
    hint: "白底合规",
    promptBoost:
      "Amazon 主图风格，纯白背景，商品占画面约 85%，无文字无水印，边缘清晰",
    preferredAspect: "1:1",
  },
  {
    id: "packshot",
    label: "包装平铺",
    hint: "礼盒/包装",
    promptBoost: "包装盒平铺俯拍或 45 度，展示品牌面与结构，柔和棚拍光",
    preferredAspect: "1:1",
  },
];

export const VIDEO_SCENES: ScenePreset[] = [
  {
    id: "spin-360",
    label: "产品旋转",
    hint: "360°",
    promptBoost:
      "8 秒产品白底旋转展示，匀速环绕，灯光干净，无文字，适合电商主图视频",
    preferredAspect: "1:1",
  },
  {
    id: "unbox",
    label: "开箱手持",
    hint: "种草",
    promptBoost: "竖版开箱手持镜头，先全貌再特写细节，自然手持微晃，口播留白",
    preferredAspect: "9:16",
  },
  {
    id: "talking-head",
    label: "口播分镜",
    hint: "人+产品",
    promptBoost: "口播分镜：中景人物+产品特写交替，字幕安全区，竖版短视频节奏",
    preferredAspect: "9:16",
  },
  {
    id: "ad-landscape",
    label: "横版广告",
    hint: "投放",
    promptBoost: "横版 15 秒广告片感，开场钩子→产品展示→收尾标板，电影感运镜",
    preferredAspect: "16:9",
  },
  {
    id: "ugc-hook",
    label: "UGC 钩子",
    hint: "前 3 秒",
    promptBoost: "竖版 UGC 前 3 秒强钩子，问题/对比开场，真实感，快速切到产品",
    preferredAspect: "9:16",
  },
  {
    id: "still-to-motion",
    label: "静图动效",
    hint: "5–10 秒",
    promptBoost:
      "商品静图生成 5–10 秒动效：主体稳定、背景或光影微动、镜头轻推或环绕，适合电商主图视频；不要变形、不要乱加文字",
    preferredAspect: "1:1",
  },
  {
    id: "first-last-frame",
    label: "首尾帧控镜",
    hint: "可灵·Veo",
    promptBoost:
      "按首帧与尾帧控镜：写清起幅构图、结束构图、中间运镜与时长（约 5–8 秒），保持主体一致，适合可灵 / Veo 图生视频",
    preferredAspect: "16:9",
  },
];

export function studioModeFor(productId: string): StudioMode | null {
  if (
    productId === "ecommerce-image" ||
    productId === "product-replica" ||
    productId === "shop-photo-audit"
  ) {
    return "product";
  }
  // 视频成片类多为方案陪跑，不开放站内出图工作室
  if (
    productId === "ai-image-make" ||
    productId === "copy-to-image" ||
    productId === "dall-e-3" ||
    productId === "jimeng-image" ||
    productId === "stable-diffusion-xl" ||
    productId === "retail-marketing" ||
    productId === "prompt-reverse"
  ) {
    return "general";
  }
  return null;
}

export function scenesForMode(mode: StudioMode): ScenePreset[] {
  if (mode === "product") return PRODUCT_SCENES;
  if (mode === "video") return VIDEO_SCENES;
  return GENERAL_SCENES;
}

/** wanx-v1 仅允许这几档；按比例就近映射 */
const WANX_ALLOWED: { w: number; h: number; ratio: number }[] = [
  { w: 1024, h: 1024, ratio: 1 },
  { w: 768, h: 1152, ratio: 768 / 1152 },
  { w: 720, h: 1280, ratio: 720 / 1280 },
  { w: 1280, h: 720, ratio: 1280 / 720 },
];

/** 万相常用 size：宽*高（强制落在官方白名单） */
export function wanxSize(aspect: AspectRatioId, tier: ResTierId): string {
  void tier; // 万相 v1 无独立 2K/4K 档，分辨率由白名单决定
  const ratio = ASPECT_RATIOS.find((item) => item.id === aspect)!;
  const value = ratio.w / ratio.h;
  let best = WANX_ALLOWED[0];
  let bestDiff = Math.abs(best.ratio - value);
  for (const item of WANX_ALLOWED) {
    const diff = Math.abs(item.ratio - value);
    if (diff < bestDiff) {
      best = item;
      bestDiff = diff;
    }
  }
  return `${best.w}*${best.h}`;
}

/** OpenAI DALL·E 3 仅三档；按比例就近映射 */
export function openaiSize(aspect: AspectRatioId): string {
  const ratio = ASPECT_RATIOS.find((item) => item.id === aspect)!;
  const value = ratio.w / ratio.h;
  if (value > 1.2) return "1792x1024";
  if (value < 0.85) return "1024x1792";
  return "1024x1024";
}

export function buildStudioPrompt(input: {
  userPrompt: string;
  scene?: ScenePreset | null;
  aspect: AspectRatioId;
  tier: ResTierId;
  mode: StudioMode;
}) {
  const parts = [input.userPrompt.trim()];
  if (input.scene?.promptBoost) parts.push(input.scene.promptBoost);
  parts.push(`画面比例 ${input.aspect}，输出清晰度倾向 ${input.tier.toUpperCase()}`);
  if (input.mode === "product") {
    parts.push("商品主体完整、无畸形、无乱码文字");
  }
  if (input.mode === "video") {
    parts.push("按视频分镜/关键帧描述来画，构图适合后续成片");
  }
  return parts.filter(Boolean).join("。");
}
