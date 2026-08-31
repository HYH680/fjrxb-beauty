import type { Product } from "@/types";
import { preferEnglishCopy } from "@/lib/i18n/localize-copy";

/** Short shelf pitches for the 4 quick buttons above the guide input. */
export const GUIDE_CHIP_POOL: ReadonlyArray<{
  id: string;
  zh: string;
  en: string;
}> = [
  { id: "shop-cs", zh: "店铺客服", en: "Shop support" },
  { id: "contract-photo-review", zh: "合同审阅", en: "Contract review" },
  { id: "langchain-pro", zh: "知识库问答", en: "Knowledge Q&A" },
  { id: "cursor-pro", zh: "研发提效", en: "Dev help" },
  { id: "ai-image-make", zh: "AI 出图", en: "AI images" },
  { id: "prompt-reverse", zh: "反推提示词", en: "Prompt reverse" },
  { id: "invoice-photo", zh: "发票识别", en: "Invoice OCR" },
  { id: "we-media-script", zh: "自媒体写稿", en: "Creator copy" },
  { id: "product-replica", zh: "商品复刻", en: "Product replica" },
  { id: "whisper-api", zh: "会议转录", en: "Meeting notes" },
  { id: "capcut-auto", zh: "自动剪辑", en: "Auto edit" },
  { id: "resume-screen", zh: "简历筛选", en: "Resume screen" },
];

export type GuideChipPick = {
  id: string;
  label: string;
  price?: number;
  unit?: string;
};

export function guideChipLabel(
  item: { zh: string; en: string },
  locale: string
): string {
  return preferEnglishCopy(locale) ? item.en : item.zh;
}

/** Pick up to 4 published services; rotate by tick; labels follow UI locale. */
export function pickGuideChips(
  products: Array<Pick<Product, "id" | "published" | "price" | "unit">>,
  locale: string,
  tick = 0
): GuideChipPick[] {
  const byId = new Map(products.map((p) => [p.id, p]));
  const pool = GUIDE_CHIP_POOL.filter((c) => {
    const p = byId.get(c.id);
    return p && p.published !== false;
  });
  if (pool.length === 0) return [];

  const n = Math.min(4, pool.length);
  const start = ((tick % pool.length) + pool.length) % pool.length;
  const ordered = [...pool.slice(start), ...pool.slice(0, start)].slice(0, n);
  return ordered.map((c) => {
    const p = byId.get(c.id);
    return {
      id: c.id,
      label: guideChipLabel(c, locale),
      price: p?.price,
      unit: p?.unit,
    };
  });
}

/** Landing scene strip: first N published guide chips (stable, not rotating). */
export function landingGuideShortcuts(
  products: Array<Pick<Product, "id" | "published" | "price" | "unit">>,
  locale: string,
  count = 4
): GuideChipPick[] {
  const byId = new Map(products.map((p) => [p.id, p]));
  const picks: GuideChipPick[] = [];
  for (const c of GUIDE_CHIP_POOL) {
    const p = byId.get(c.id);
    if (!p || p.published === false) continue;
    picks.push({
      id: c.id,
      label: guideChipLabel(c, locale),
      price: p.price,
      unit: p.unit,
    });
    if (picks.length >= count) break;
  }
  return picks;
}
