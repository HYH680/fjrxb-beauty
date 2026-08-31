import { listCatalog } from "@/lib/catalog";
import {
  localizedCategoryLabel,
  localizedProductFields,
} from "@/lib/i18n/localize-copy";

export async function compactCatalogPrompt(locale = "zh-CN"): Promise<string> {
  const products = await listCatalog();
  return products
    .map((raw) => {
      const p = localizedProductFields(raw, locale);
      const unit = p.unit === "每月" && !locale.startsWith("zh") ? "month" : p.unit;
      const priceLabel = locale.startsWith("zh")
        ? `${p.price}元/${unit}`
        : `${p.price}/${unit}`;
      const category = localizedCategoryLabel(p.category, locale);
      return `- ${p.id}|${p.name}|${category}|${priceLabel}`;
    })
    .join("\n");
}
