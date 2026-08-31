import type { Product } from "@/types";
import {
  getNamedProviderConfig,
  getVisionRuntimeConfig,
  getVisionRuntimeConfigs,
  isGatewayEnabled,
  liveConfigAttempts,
  type LlmConfig,
  type ProviderName,
} from "@/lib/llm-config";

export type TaskKind =
  | "vision"
  | "code"
  | "chinese-copy"
  | "customer-service"
  | "translation"
  | "analysis"
  | "legal"
  | "reasoning"
  | "general";

export const TASK_LABEL: Record<TaskKind, string> = {
  vision: "看图",
  code: "代码",
  "chinese-copy": "中文内容",
  "customer-service": "中文客服",
  translation: "跨境语言",
  analysis: "分析",
  legal: "合同审阅",
  reasoning: "复杂推理",
  general: "通用对话",
};

/**
 * 每加一个模型：在这里加一条，填 scores。
 * 有密钥的模型会按分自动抢对应服务；不通的模型不会入选。
 * 分数 0 或缺省 = 不擅长，不参与该项。
 */
export type ModelProfile = {
  id: string;
  label: string;
  why: string;
  kind: "chat" | "vision";
  provider: ProviderName;
  model?: string;
  scores: Partial<Record<TaskKind, number>>;
};

export const MODEL_CATALOG: ModelProfile[] = [
  {
    id: "claude-sonnet-live",
    label: "Claude Sonnet",
    why: "长文本、合同与代码审查表达稳妥，经兼容通道试用。",
    kind: "chat",
    provider: "anthropic",
    model: "claude-sonnet-4-20250514",
    scores: {
      legal: 94,
      code: 88,
      reasoning: 90,
      analysis: 86,
      translation: 80,
      general: 88,
    },
  },
  {
    id: "qwen-plus",
    label: "千问 3.8 Max",
    why: "中文客服、详情页和国内店话术最稳，作默认首选。",
    kind: "chat",
    provider: "qwen",
    model: "qwen3.8-max",
    scores: {
      "customer-service": 96,
      "chinese-copy": 96,
      translation: 78,
      analysis: 90,
      legal: 72,
      reasoning: 70,
      code: 58,
      general: 94,
    },
  },
  {
    id: "qwen-vl",
    label: "千问看图",
    why: "合同、发票、商品主图需要读图时走这条。",
    kind: "vision",
    provider: "qwen",
    scores: {
      vision: 96,
      legal: 74,
      analysis: 60,
      general: 30,
    },
  },
  {
    id: "doubao",
    label: "豆包 Seed 2.1 Pro",
    why: "国内客服和短内容接近千问，作中文备选。",
    kind: "chat",
    provider: "doubao",
    model: "doubao-seed-2-1-pro-260628",
    scores: {
      "customer-service": 88,
      "chinese-copy": 86,
      translation: 64,
      analysis: 72,
      legal: 58,
      reasoning: 58,
      code: 50,
      general: 82,
    },
  },
  {
    id: "deepseek-chat",
    label: "DeepSeek V4 Pro",
    why: "代码、推理和英文刊登更强；中文日常话术让给千问。",
    kind: "chat",
    provider: "deepseek",
    model: "deepseek-v4-pro",
    scores: {
      code: 96,
      reasoning: 93,
      analysis: 82,
      translation: 80,
      legal: 76,
      "chinese-copy": 55,
      "customer-service": 50,
      general: 72,
    },
  },
  {
    id: "kimi",
    label: "Kimi K2.6",
    why: "长合同、长文档上下文更好。",
    kind: "chat",
    provider: "kimi",
    model: "kimi-k2.6",
    scores: {
      legal: 88,
      analysis: 80,
      "chinese-copy": 78,
      "customer-service": 74,
      translation: 74,
      reasoning: 72,
      code: 52,
      general: 78,
    },
  },
  {
    id: "gpt-5.6-sol",
    label: "GPT-5.6 Sol",
    why: "复杂推理、代码、跨境合同等高质量任务优先。",
    kind: "chat",
    provider: "openai",
    model: "gpt-5.6-sol",
    scores: {
      reasoning: 97,
      code: 94,
      translation: 96,
      legal: 90,
      analysis: 88,
      "customer-service": 68,
      "chinese-copy": 62,
      general: 86,
    },
  },
  {
    id: "gemini-pro",
    label: "Gemini 2.5 Pro",
    why: "本站无 Google 直连时，经 API2D 补旗舰长上下文、多语言与复杂分析。",
    kind: "chat",
    provider: "freellmapi",
    model: "gemini-2.5-pro",
    scores: {
      translation: 95,
      analysis: 93,
      reasoning: 90,
      general: 90,
      legal: 82,
      code: 80,
      "chinese-copy": 70,
      "customer-service": 65,
    },
  },
  {
    id: "grok-3",
    label: "Grok 3",
    why: "xAI 热点与即时向对话；本站经 OpenAI 兼容中转补货架。",
    kind: "chat",
    provider: "freellmapi",
    model: "grok-3",
    scores: {
      general: 88,
      reasoning: 84,
      analysis: 80,
      "chinese-copy": 72,
      "customer-service": 60,
      code: 70,
      translation: 75,
      legal: 55,
    },
  },
  {
    id: "ernie-5",
    label: "文心 ERNIE 5.0",
    why: "百度千帆旗舰，中文理解、推理与长文本更强。",
    kind: "chat",
    provider: "baidu",
    model: "ernie-5.0-thinking-preview",
    scores: {
      "chinese-copy": 94,
      "customer-service": 92,
      analysis: 91,
      reasoning: 93,
      legal: 85,
      general: 92,
      translation: 80,
      code: 72,
    },
  },
];

export type LiveModel = ModelProfile & {
  config: LlmConfig;
};

function profileConfig(profile: ModelProfile): LlmConfig | null {
  if (profile.id === "qwen-vl") {
    return getVisionRuntimeConfig();
  }
  const cfg = getNamedProviderConfig(profile.provider, profile.model);
  // FreeLLMAPI 只补缺；没有自己的 key 时不要靠 new-api 网关冒充可用
  if (profile.provider === "freellmapi") {
    return cfg.apiKey ? cfg : null;
  }
  if (!cfg.apiKey && !isGatewayEnabled()) return null;
  if (!cfg.apiKey && isGatewayEnabled()) return cfg;
  return cfg.apiKey ? cfg : null;
}

export function listLiveModels(): LiveModel[] {
  return MODEL_CATALOG.flatMap((profile) => {
    const config = profileConfig(profile);
    if (!profileConfigIsUsable(profile, config)) return [];
    return [{ ...profile, config: config as LlmConfig }];
  });
}

function profileConfigIsUsable(
  profile: ModelProfile,
  config: LlmConfig | null
): config is LlmConfig {
  if (!config) return false;
  if (profile.kind === "vision") return Boolean(config.apiKey);
  if (profile.provider === "freellmapi") return Boolean(config.apiKey);
  return Boolean(config.apiKey) || isGatewayEnabled();
}

export function scoreForTask(profile: ModelProfile, task: TaskKind) {
  return profile.scores[task] ?? 0;
}

export function rankModelsForTask(task: TaskKind): LiveModel[] {
  return listLiveModels()
    .filter((model) => {
      if (task === "vision") return model.kind === "vision" && scoreForTask(model, "vision") > 0;
      if (model.kind === "vision") return false;
      return scoreForTask(model, task) > 0;
    })
    .sort((a, b) => scoreForTask(b, task) - scoreForTask(a, task));
}

export function attemptsForTask(task: TaskKind): LlmConfig[] {
  const ranked = rankModelsForTask(task);
  const attempts: LlmConfig[] = [];
  for (const model of ranked) {
    const extras =
      model.id === "qwen-vl"
        ? getVisionRuntimeConfigs()
        : liveConfigAttempts(model.config);
    for (const item of extras) {
      const exists = attempts.some(
        (row) =>
          row.baseUrl === item.baseUrl &&
          row.model === item.model &&
          row.apiKey === item.apiKey
      );
      if (!exists) attempts.push(item);
    }
  }
  return attempts;
}

const VISION_PRODUCTS = new Set([
  "shop-photo-audit",
  "contract-photo-review",
  "invoice-photo",
  "homework-grade",
  "smart-bookkeeping",
  "prompt-reverse",
  "product-replica",
  "video-replica",
  "ecommerce-image",
  "ai-image-make",
  "dall-e-3",
  "jimeng-image",
  "stable-diffusion-xl",
  "midjourney-api",
  "replicate-api",
  "image-matting",
  "image-enhance",
  "content-moderation",
  "image-search",
  "table-ocr",
  "seal-detect",
  "doc-compare",
  "we-media-topics",
  "we-media-storyboard",
  "we-media-video",
  "we-media-review",
]);

const TASK_BY_PRODUCT: Record<string, TaskKind> = {
  "restaurant-cs": "customer-service",
  "shop-cs": "customer-service",
  "shop-review": "customer-service",
  "shop-listing": "chinese-copy",
  "retail-marketing": "chinese-copy",
  "cross-border-listing": "translation",
  "cross-border-cs": "translation",
  "menu-optimize": "analysis",
  "inventory-forecast": "analysis",
  "invoice-photo": "vision",
  "shop-photo-audit": "vision",
  "contract-photo-review": "legal",
  "deepseek-chat": "code",
  "cursor-pro": "code",
  "gsap-skills": "code",
  "watermarks-remover": "chinese-copy",
  "langchain-pro": "code",
  "capcut-auto": "chinese-copy",
  "ai-subtitle": "translation",
  "smart-clip-select": "analysis",
  "digital-human": "chinese-copy",
  "ai-image-make": "vision",
  "dall-e-3": "vision",
  "jimeng-image": "vision",
  "stable-diffusion-xl": "vision",
  "copy-to-image": "chinese-copy",
  "ai-video-gen": "chinese-copy",
  "kling-video": "chinese-copy",
  "ai-comic-drama": "chinese-copy",
  "grok-chat": "general",
  "video-replica": "vision",
  "voice-clone": "chinese-copy",
  "ai-music-bgm": "chinese-copy",
  "elevenlabs-tts": "chinese-copy",
  "prompt-reverse": "vision",
  "ai-workflow": "general",
  "ai-self-media": "chinese-copy",
  "we-media-topics": "analysis",
  "we-media-script": "chinese-copy",
  "we-media-storyboard": "chinese-copy",
  "we-media-voice": "chinese-copy",
  "we-media-video": "chinese-copy",
  "we-media-publish": "chinese-copy",
  "we-media-review": "analysis",
  "ecommerce-image": "vision",
  "product-replica": "vision",
  "course-notes": "chinese-copy",
  "homework-grade": "vision",
  "enroll-copy": "chinese-copy",
  "resume-screen": "analysis",
  "interview-questions": "chinese-copy",
  "hr-qa-bot": "customer-service",
  "open-resume": "chinese-copy",
  "cover-letter": "chinese-copy",
  "mock-interview": "chinese-copy",
  "job-search-agent": "analysis",
  "smart-bookkeeping": "vision",
  "business-report": "analysis",
  "contract-reminder": "general",
  "gpt-5.6-sol": "reasoning",
  "openai-assistants": "reasoning",
  "claude-sonnet": "legal",
  "whisper-api": "analysis",
  "meeting-minutes": "analysis",
  "pinecone": "analysis",
  "weaviate-cloud": "analysis",
  "ppt-deck": "chinese-copy",
  "sales-leads": "customer-service",
  "work-im-bot": "customer-service",
  "sheet-analyst": "analysis",
  "ai-summarize": "analysis",
  "ai-rewrite": "chinese-copy",
  "image-matting": "vision",
  "image-enhance": "vision",
  "content-moderation": "vision",
  "image-search": "vision",
  "table-ocr": "vision",
  "doc-compare": "legal",
  "seal-detect": "vision",
  "doubao-seed": "chinese-copy",
  "ernie-5": "reasoning",
  "gemini-pro": "reasoning",
  "qwen-plus": "chinese-copy",
  "runway-gen3": "chinese-copy",
  "midjourney-api": "vision",
  "replicate-api": "vision",
  "cohere-embed": "analysis",
};

export function isVisionProduct(product: Pick<Product, "id">) {
  return VISION_PRODUCTS.has(product.id);
}

export function productTask(
  product: Product,
  input?: { message?: string; hasImages?: boolean }
): TaskKind {
  if (input?.hasImages) return "vision";
  const text = input?.message || "";
  if (
    /```|代码|报错|函数|组件|python|typescript|javascript|bug|重构|sql/i.test(
      text
    )
  ) {
    return "code";
  }
  if (TASK_BY_PRODUCT[product.id]) {
    const mapped = TASK_BY_PRODUCT[product.id];
    if (mapped === "legal" && isVisionProduct(product) && !text.trim()) {
      return "vision";
    }
    return mapped;
  }
  if (product.category === "ecommerce" || product.category === "retail") {
    return "customer-service";
  }
  if (product.category === "docs") return "legal";
  if (product.runtime?.provider === "deepseek") return "code";
  if (product.runtime?.provider === "openai") return "reasoning";
  if (product.runtime?.provider === "qwen") return "chinese-copy";
  return "general";
}

export function describeLiveModel(config: LlmConfig, task: TaskKind) {
  const profile = MODEL_CATALOG.find(
    (item) =>
      item.model === config.model ||
      (item.id === "qwen-vl" && /vl/i.test(config.model)) ||
      (item.provider === "openai" && config.model.toLowerCase().includes("gpt"))
  );
  const brand =
    profile?.label ||
    (config.model.includes("deepseek")
      ? "DeepSeek"
      : config.model.includes("doubao")
        ? "豆包"
        : config.model.includes("vl")
          ? "千问看图"
          : config.model.includes("qwen")
            ? "千问"
            : config.model.includes("moonshot") || config.model.includes("kimi")
              ? "Kimi"
              : config.model);
  return `${brand} · ${TASK_LABEL[task]}`;
}

export function serviceModelBoard(products: Product[]) {
  const live = listLiveModels();
  const rows = products.map((product) => {
    const task = productTask(product, {
      hasImages: isVisionProduct(product),
    });
    const ranked = rankModelsForTask(task);
    const winner = ranked[0];
    return {
      productId: product.id,
      name: product.name,
      task,
      taskLabel: TASK_LABEL[task],
      winner: winner
        ? { id: winner.id, label: winner.label, model: winner.config.model, why: winner.why }
        : null,
      fallback: ranked[1]
        ? { id: ranked[1].id, label: ranked[1].label, model: ranked[1].config.model }
        : null,
    };
  });
  return {
    live: live.map((model) => ({
      id: model.id,
      label: model.label,
      model: model.config.model,
      kind: model.kind,
      why: model.why,
    })),
    services: rows,
    hint: "以后加模型：在 src/lib/model-catalog.ts 的 MODEL_CATALOG 加一条并填写对应 API Key。有密钥且该项分数更高，就会自动成为这项服务的首选。",
  };
}

/** 不依赖密钥：按任务分数给出首选/备选文案（工作台默认展示用） */
export function catalogRecommendForProduct(product: Product) {
  const task = productTask(product, {
    hasImages: isVisionProduct(product),
  });
  const ranked = MODEL_CATALOG.filter((profile) => {
    if (task === "vision") {
      return profile.kind === "vision" && scoreForTask(profile, "vision") > 0;
    }
    if (profile.kind === "vision") return false;
    return scoreForTask(profile, task) > 0;
  }).sort((a, b) => scoreForTask(b, task) - scoreForTask(a, task));

  const primary = ranked[0];
  const fallback = ranked[1];
  return {
    task,
    taskLabel: TASK_LABEL[task],
    primaryLabel: primary?.label || "待分配",
    primaryWhy: primary?.why || "",
    fallbackLabel: fallback?.label || "",
    autoHint: primary
      ? `推荐 ${primary.label} · ${TASK_LABEL[task]}（省钱）`
      : `自动匹配 · ${TASK_LABEL[task]}`,
  };
}
