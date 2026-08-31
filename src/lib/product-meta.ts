import type { Product } from "@/types";
import type { MessageKey } from "@/lib/i18n/messages";

/** 目录场景（比 category 更贴近「我在干嘛」） */
export type SceneId =
  | "shop"
  | "we-media"
  | "content"
  | "office"
  | "voice-video"
  | "dev";

export type DeliveryStatus = "live" | "setup" | "playbook";

export type ProductKind = "model" | "scenario";

export type ShelfGroupId = "image_channel" | "customer_service" | "vision_assist";

export const SCENE_LABEL_KEYS: Record<SceneId, MessageKey> = {
  shop: "scene.shop",
  "we-media": "scene.weMedia",
  content: "scene.content",
  office: "scene.office",
  "voice-video": "scene.voiceVideo",
  dev: "scene.dev",
};

export const SCENE_HINT_KEYS: Record<SceneId, MessageKey> = {
  shop: "scene.hint.shop",
  "we-media": "scene.hint.weMedia",
  content: "scene.hint.content",
  office: "scene.hint.office",
  "voice-video": "scene.hint.voiceVideo",
  dev: "scene.hint.dev",
};

/** @deprecated use SCENE_LABEL_KEYS + t() — kept for rare non-UI string fallbacks */
export const SCENE_LABELS: Record<SceneId, string> = {
  shop: "开店与客服",
  "we-media": "自媒体",
  content: "出图与内容",
  office: "办公与文档",
  "voice-video": "语音与短视频",
  dev: "研发与知识库",
};

export const SCENE_HINTS: Record<SceneId, string> = {
  shop: "网店、餐饮、跨境客服与评价",
  "we-media": "选题、写稿、分镜、配音、成片、发布、复盘",
  content: "海报、商品图、文案作图",
  office: "合同、发票、纪要、表格",
  "voice-video": "配音、克隆、转写、成片",
  dev: "Agent、检索、研发提效",
};

export const SHELF_GROUP_LABEL_KEYS: Record<ShelfGroupId, MessageKey> = {
  image_channel: "shelf.group.image.label",
  customer_service: "shelf.group.cs.label",
  vision_assist: "shelf.group.vision.label",
};

export const SHELF_GROUP_HINT_KEYS: Record<ShelfGroupId, MessageKey> = {
  image_channel: "shelf.group.image.hint",
  customer_service: "shelf.group.cs.hint",
  vision_assist: "shelf.group.vision.hint",
};

/** 货架分区色：一眼能分出客服 / 出图 / 办公，避免全站同一套蓝标签 */
export const SCENE_TONE: Record<
  SceneId,
  { rail: string; chip: string; wash: string; mark: string }
> = {
  shop: {
    rail: "bg-[#e08a3c]",
    chip: "bg-[#e08a3c]/18 text-[#f3c58a]",
    wash: "hover:border-[#e08a3c]/40",
    mark: "#e08a3c",
  },
  "we-media": {
    rail: "bg-[#c2410c]",
    chip: "bg-[#c2410c]/20 text-[#fdba74]",
    wash: "hover:border-[#c2410c]/40",
    mark: "#c2410c",
  },
  content: {
    rail: "bg-[#e06b8a]",
    chip: "bg-[#e06b8a]/18 text-[#f4b4c4]",
    wash: "hover:border-[#e06b8a]/40",
    mark: "#e06b8a",
  },
  office: {
    rail: "bg-[#8b7cf6]",
    chip: "bg-[#8b7cf6]/18 text-[#c4bdfc]",
    wash: "hover:border-[#8b7cf6]/40",
    mark: "#8b7cf6",
  },
  "voice-video": {
    rail: "bg-[#2dd4bf]",
    chip: "bg-[#2dd4bf]/18 text-[#99f6e4]",
    wash: "hover:border-[#2dd4bf]/40",
    mark: "#2dd4bf",
  },
  dev: {
    rail: "bg-[#4ade80]",
    chip: "bg-[#4ade80]/18 text-[#bbf7d0]",
    wash: "hover:border-[#4ade80]/40",
    mark: "#4ade80",
  },
};

export const SHELF_SCENES: SceneId[] = [
  "shop",
  "we-media",
  "content",
  "office",
  "voice-video",
  "dev",
];

const SCENE_BY_CATEGORY: Partial<Record<Product["category"], SceneId>> = {
  ecommerce: "shop",
  retail: "shop",
  image: "content",
  creative: "content",
  docs: "office",
  finance: "office",
  education: "office",
  hr: "office",
  speech: "voice-video",
  "video-edit": "voice-video",
  "dev-tools": "dev",
  "vector-db": "dev",
  api: "dev",
  "we-media": "we-media",
};

/** 重叠能力：默认只露主卡，其余收进「更多同类」 */
export const SHELF_GROUPS: Record<
  ShelfGroupId,
  { primary: string; alternates: string[]; collapseLabel: string; hint: string }
> = {
  image_channel: {
    primary: "ai-image-make",
    alternates: ["jimeng-image", "midjourney-api", "replicate-api"],
    collapseLabel: "更多出图通道",
    hint: "先选「在线出图」即可（万相首选、即梦备选）。即梦专卡、Midjourney、Replicate 是不同通道，不必全买。",
  },
  customer_service: {
    primary: "shop-cs",
    alternates: ["restaurant-cs", "cross-border-cs", "shop-review"],
    collapseLabel: "更多客服场景",
    hint: "先选「网店客服起草」。都是起草回复，不能接管千牛或美团后台。",
  },
  vision_assist: {
    primary: "image-matting",
    alternates: ["image-enhance", "image-search", "content-moderation", "shop-photo-audit"],
    collapseLabel: "更多看图建议",
    hint: "都是千问看图给方案和提示词，不是成品抠图层 / 超分引擎 / 以图搜全网。",
  },
};

/** 工作台有专用媒体/成片能力的 SKU（Suno / MJ / Replicate / Cohere / CapCut 另由通道开关决定） */
const LIVE_MEDIA_IDS = new Set([
  "dall-e-3",
  "jimeng-image",
  "stable-diffusion-xl",
  "ai-image-make",
  "copy-to-image",
  "ecommerce-image",
  "product-replica",
  "prompt-reverse",
  "retail-marketing",
  "shop-photo-audit",
  "whisper-api",
  "meeting-minutes",
  "elevenlabs-tts",
  "voice-clone",
  "runway-gen3",
  "ai-video-gen",
  "kling-video",
  "digital-human",
  "we-media-voice",
  "we-media-video",
  "ai-subtitle",
  "smart-clip-select",
  "capcut-auto",
  "replicate-api",
]);

/** 通道已写进工作台：有密钥/自建地址才标 live，否则 setup（不再锁死 playbook） */
const SETUP_CHANNEL_IDS = new Set([
  "midjourney-api",
  "ai-music-bgm",
  "replicate-api",
  "cohere-embed",
  "capcut-auto",
]);

export function productKind(
  product: Pick<Product, "category">
): ProductKind {
  return product.category === "llm" ? "model" : "scenario";
}

export function productKindLabelKey(kind: ProductKind): MessageKey {
  return kind === "model" ? "kind.model" : "kind.scenario";
}

/** @deprecated use productKindLabelKey + t() */
export function productKindLabel(kind: ProductKind) {
  return kind === "model" ? "模型通道" : "场景服务";
}

export function sceneForProduct(product: Pick<Product, "category" | "id">): SceneId {
  return SCENE_BY_CATEGORY[product.category] || "dev";
}

export function shelfAlternateGroup(productId: string): ShelfGroupId | null {
  for (const [groupId, group] of Object.entries(SHELF_GROUPS) as [
    ShelfGroupId,
    (typeof SHELF_GROUPS)[ShelfGroupId],
  ][]) {
    if (group.alternates.includes(productId)) return groupId;
  }
  return null;
}

export function isShelfAlternate(product: Pick<Product, "id">) {
  return shelfAlternateGroup(product.id) !== null;
}

export function isShelfPrimary(product: Pick<Product, "id">) {
  return Object.values(SHELF_GROUPS).some((group) => group.primary === product.id);
}

export function layoutShelfAisle(items: Product[]) {
  const alternateIds = new Set<string>();
  for (const group of Object.values(SHELF_GROUPS)) {
    for (const id of group.alternates) alternateIds.add(id);
  }

  const main = items.filter((item) => !alternateIds.has(item.id));
  const altGroups = (
    Object.entries(SHELF_GROUPS) as [
      ShelfGroupId,
      (typeof SHELF_GROUPS)[ShelfGroupId],
    ][]
  )
    .map(([id, group]) => ({
      id,
      label: group.collapseLabel,
      hint: group.hint,
      items: items.filter((item) => group.alternates.includes(item.id)),
    }))
    .filter((group) => group.items.length > 0);

  return { main, altGroups };
}

export type ResolveDeliveryOptions = {
  sunoLive?: boolean;
  sunoConfigured?: boolean;
  mjLive?: boolean;
  mjConfigured?: boolean;
  replicateLive?: boolean;
  cohereLive?: boolean;
  capcutLive?: boolean;
};

function channelDelivery(
  live: boolean | undefined,
  optsPassed: boolean,
  fallback: Product["delivery"]
): DeliveryStatus {
  if (optsPassed) return live ? "live" : "setup";
  return fallback === "live" ? "live" : "setup";
}

/**
 * 统一交付标注（通道开关优先于 products.ts 里可能过时的 live）：
 * live = 工作台可直接用核心能力（本机旁路须探测通）
 * setup = 已接通道，但缺密钥，或旁路进程没起来
 * playbook = 方案与接入陪跑
 */
export function resolveDelivery(
  product: Pick<Product, "id" | "delivery" | "badge" | "access" | "runtime">,
  opts?: ResolveDeliveryOptions
): DeliveryStatus {
  const passed = Boolean(opts);
  if (product.id === "ai-music-bgm") {
    return channelDelivery(opts?.sunoLive, passed, product.delivery);
  }
  if (product.id === "midjourney-api") {
    return channelDelivery(opts?.mjLive, passed, product.delivery);
  }
  if (product.id === "replicate-api") {
    return channelDelivery(opts?.replicateLive, passed, product.delivery);
  }
  if (product.id === "cohere-embed") {
    return channelDelivery(opts?.cohereLive, passed, product.delivery);
  }
  if (product.id === "capcut-auto") {
    return channelDelivery(opts?.capcutLive, passed, product.delivery);
  }

  if (
    product.delivery === "setup" ||
    product.delivery === "playbook" ||
    product.delivery === "live"
  ) {
    return product.delivery;
  }

  if (product.badge === "方案陪跑") return "playbook";
  if (SETUP_CHANNEL_IDS.has(product.id)) return "setup";
  if (LIVE_MEDIA_IDS.has(product.id)) return "live";
  if (product.runtime) return "live";
  if (product.access === "customer") return "playbook";
  return "playbook";
}

export function deliveryLabelKey(
  delivery: DeliveryStatus,
  badge?: string
): MessageKey {
  if (delivery === "live") return "delivery.live";
  if (delivery === "setup" && badge === "待启动代理") return "delivery.setupProxy";
  if (delivery === "setup") return "delivery.setupKey";
  return "delivery.playbook";
}

/** @deprecated use deliveryLabelKey + t() */
export function deliveryLabel(delivery: DeliveryStatus, badge?: string) {
  if (delivery === "live") return "在线可用";
  if (delivery === "setup" && badge === "待启动代理") return "待启动代理";
  if (delivery === "setup") return "待配置密钥";
  return "方案陪跑";
}

export function deliveryBadgeClass(delivery: DeliveryStatus) {
  if (delivery === "live") return "bg-emerald-500/15 text-emerald-300";
  if (delivery === "setup") return "bg-sky-500/15 text-sky-200";
  return "bg-amber-500/15 text-amber-200";
}

export function shelfActionLabelKey(
  delivery: DeliveryStatus,
  badge?: string
): MessageKey {
  if (delivery === "live") return "shelf.action.workspace";
  if (badge === "待启动代理") return "shelf.action.proxyHow";
  if (delivery === "setup") return "shelf.action.askSetup";
  return "shelf.action.askGuide";
}

/** @deprecated use shelfActionLabelKey + t() */
export function shelfActionLabel(delivery: DeliveryStatus, badge?: string) {
  if (delivery === "live") return "去工作台";
  if (badge === "待启动代理") return "看启动方法";
  if (delivery === "setup") return "问导购配置";
  return "问导购";
}

export function shelfActionHref(
  productId: string,
  delivery: DeliveryStatus,
  badge?: string
) {
  if (delivery === "live") return `/use/${productId}`;
  if (badge === "待启动代理") return `/tools/${productId}`;
  return `/chat?about=${productId}`;
}

/** 给目录/卡片用的规范化产品 */
export function withProductMeta<T extends Product>(
  product: T,
  opts?: ResolveDeliveryOptions
): T & {
  delivery: DeliveryStatus;
  scene: SceneId;
  kind: ProductKind;
} {
  const delivery = resolveDelivery(product, opts);
  let badge = product.badge;
  if (opts && product.id === "ai-music-bgm") {
    badge = opts.sunoLive
      ? "已接通"
      : opts.sunoConfigured
        ? "待启动代理"
        : "待配置";
  } else if (opts && product.id === "midjourney-api") {
    badge = opts.mjLive
      ? "已接通"
      : opts.mjConfigured
        ? "待启动代理"
        : "待配置";
  } else if (opts && product.id === "replicate-api") {
    badge = opts.replicateLive ? "已接通" : "暂停上线";
  } else if (
    delivery === "live" &&
    product.badge === "方案陪跑"
  ) {
    badge = "已接通";
  } else if (!badge) {
    badge =
      delivery === "playbook"
        ? "方案陪跑"
        : delivery === "setup"
          ? "待配置"
          : badge;
  }
  return {
    ...product,
    delivery,
    scene: sceneForProduct(product),
    kind: productKind(product),
    badge,
  };
}
