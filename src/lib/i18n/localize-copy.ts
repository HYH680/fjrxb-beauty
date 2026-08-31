import type { Category, Product } from "@/types";
import { categoryLabels } from "@/data/products";
import { featureCopyEn } from "@/lib/i18n/feature-en";
import { productCopyEn } from "@/lib/i18n/product-en";

/** Prefer English shelf copy when locale is not Chinese. */
export function preferEnglishCopy(locale: string) {
  return !(locale || "").trim().startsWith("zh");
}

const CATEGORY_EN: Record<Category, string> = {
  llm: "Chat & reasoning",
  image: "Visual creation",
  speech: "Voice & media",
  "dev-tools": "Engineering collab",
  "vector-db": "Knowledge search",
  api: "Access & hosting",
  "video-edit": "Video editing",
  creative: "Content creation",
  "we-media": "Creator media",
  retail: "Dining & retail",
  ecommerce: "Online shops",
  docs: "Contracts & docs",
  finance: "Finance & compliance",
  education: "Education & training",
  hr: "Hiring & HR",
};

const PROVIDER_EN: Record<string, string> = {
  千问: "Qwen",
  千问看图: "Qwen Vision",
  千问万相: "Tongyi Wanxiang",
  "千问万相 / 即梦": "Tongyi Wanxiang / Jimeng",
  "千问 + Runway": "Qwen + Runway",
  "千问 / MiniMax": "Qwen / MiniMax",
  "千问 / OpenResume 思路": "Qwen / resume workflow",
  "Whisper / 千问": "Whisper / Qwen",
  "本站 Whisper / 千问": "On-site Whisper / Qwen",
  "即梦 / 火山引擎": "Jimeng / Volcano Engine",
  "可灵 Kling": "Kling",
  火山方舟: "Volcano Ark",
  百度千帆: "Baidu Qianfan",
  阿里云: "Alibaba Cloud",
  "本站 Agent": "On-site Agent",
  本站知识库: "On-site knowledge base",
  本站研发助手: "On-site eng assistant",
  本站选片: "On-site clip select",
  本站剪辑引擎: "On-site edit engine",
  "本站成片 / Runway": "On-site finals / Runway",
  "企微 / 钉钉 / 飞书": "WeCom / DingTalk / Feishu",
  "Midjourney（自建 proxy）": "Midjourney (self-hosted proxy)",
  "Suno（自建 suno-api）": "Suno (self-hosted suno-api)",
  "OpenAI / 本机 Whisper": "OpenAI / local Whisper",
};

export function localizedProvider(provider: string, locale: string) {
  if (!preferEnglishCopy(locale)) return provider;
  if (PROVIDER_EN[provider]) return PROVIDER_EN[provider];
  if (/[\u4e00-\u9fff]/.test(provider)) {
    return provider
      .replace(/千问/g, "Qwen")
      .replace(/万相/g, "Wanxiang")
      .replace(/即梦/g, "Jimeng")
      .replace(/可灵/g, "Kling")
      .replace(/本站/g, "On-site")
      .replace(/自建/g, "self-hosted")
      .replace(/看图/g, "Vision")
      .replace(/思路/g, "workflow");
  }
  return provider;
}

export function localizedCategoryLabel(category: Category, locale: string) {
  if (!preferEnglishCopy(locale)) return categoryLabels[category];
  return CATEGORY_EN[category] || categoryLabels[category];
}

export function localizedProductName(
  product: Pick<Product, "id" | "name">,
  locale: string
) {
  if (!preferEnglishCopy(locale)) return product.name;
  return productCopyEn(product.id)?.name || product.name;
}

export function localizedProductDescription(
  product: Pick<Product, "id" | "description">,
  locale: string
) {
  if (!preferEnglishCopy(locale)) return product.description;
  return productCopyEn(product.id)?.description || product.description;
}

export function localizedProductFeatures(
  product: Pick<Product, "id" | "features">,
  locale: string
): string[] {
  const source = product.features ?? [];
  if (!preferEnglishCopy(locale) || source.length === 0) return source;
  const fromProduct = productCopyEn(product.id)?.features;
  if (fromProduct?.length) {
    return fromProduct.slice(0, source.length);
  }
  return source.map((zh) => featureCopyEn(zh) || zh);
}

export function localizedProductFields<
  T extends Pick<Product, "id" | "name" | "description"> & { features?: string[] },
>(product: T, locale: string): T {
  if (!preferEnglishCopy(locale)) return product;
  const en = productCopyEn(product.id);
  if (!en) {
    if (product.features?.length) {
      return {
        ...product,
        features: localizedProductFeatures(
          { id: product.id, features: product.features },
          locale
        ),
      };
    }
    return product;
  }
  return {
    ...product,
    name: en.name,
    description: en.description,
    ...(product.features
      ? {
          features: localizedProductFeatures(
            { id: product.id, features: product.features },
            locale
          ),
        }
      : {}),
  };
}

/** Map known Chinese default account names for non-zh UI. */
export function localizedDisplayName(
  name: string | null | undefined,
  locale: string
): string | null | undefined {
  if (!name?.trim()) return name;
  if (!preferEnglishCopy(locale)) return name;
  const trimmed = name.trim();
  const numbered = trimmed.match(
    /^(初级用户|初始用户)\s*([0-9０-９]+)\s*号?$/
  );
  if (numbered?.[2]) {
    const n = numbered[2].replace(/[０-９]/g, (d) =>
      String.fromCharCode(d.charCodeAt(0) - 0xff10 + 0x30)
    );
    return `Junior user ${n}`;
  }
  if (trimmed === "初级用户" || trimmed === "初始用户") return "Junior user";
  if (trimmed === "测试用户" || trimmed === "烟雾测试") return "Test user";
  if (trimmed === "运行时测试") return "Runtime test";
  if (trimmed === "管理员") return "Admin";
  return trimmed;
}
