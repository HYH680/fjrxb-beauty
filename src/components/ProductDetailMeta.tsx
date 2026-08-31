"use client";

import Link from "next/link";
import type { Product } from "@/types";
import { useLocale } from "@/hooks/useLocale";
import {
  localizedCategoryLabel,
  localizedProductDescription,
  localizedProductName,
  localizedProvider,
  preferEnglishCopy,
} from "@/lib/i18n/localize-copy";
import {
  SCENE_LABEL_KEYS,
  SCENE_TONE,
  deliveryBadgeClass,
  deliveryLabelKey,
  productKind,
  productKindLabelKey,
  resolveDelivery,
  sceneForProduct,
} from "@/lib/product-meta";

/** Client badges + title on product detail so locale can switch. */
export function ProductDetailMeta({ product }: { product: Product }) {
  const { t, locale } = useLocale();
  const delivery = resolveDelivery(product);
  const kind = productKind(product);
  const scene = sceneForProduct(product);
  const name = localizedProductName(product, locale);
  const description = localizedProductDescription(product, locale);
  const showBadge =
    Boolean(product.badge) &&
    product.badge !== "方案陪跑" &&
    !(preferEnglishCopy(locale) && /[\u4e00-\u9fff]/.test(product.badge || ""));

  return (
    <>
      <p className="mt-2 text-xs text-zinc-600">{t("detail.coverNote")}</p>
      <Link href="/products" className="mt-4 inline-block text-sm text-zinc-500 hover:text-zinc-200">
        {t("shelf.back")}
      </Link>
      <div className="mt-8 flex flex-wrap items-center gap-2">
        <span className={`rounded px-2.5 py-0.5 text-xs font-medium ${SCENE_TONE[scene].chip}`}>
          {t(SCENE_LABEL_KEYS[scene])}
        </span>
        <span className="rounded bg-white/5 px-2.5 py-0.5 text-xs text-zinc-400">
          {t(productKindLabelKey(kind))}
        </span>
        <span className="text-sm text-zinc-500">
          {localizedCategoryLabel(product.category, locale)}
        </span>
        <span className={`rounded-full px-2.5 py-0.5 text-xs ${deliveryBadgeClass(delivery)}`}>
          {t(deliveryLabelKey(delivery, product.badge))}
        </span>
        {showBadge ? (
          <span className="text-sm text-zinc-500">· {product.badge}</span>
        ) : null}
      </div>
      <h1 className="mt-8 text-4xl font-semibold tracking-tight">{name}</h1>
      <p className="mt-2 text-zinc-500">
        {localizedProvider(product.provider, locale)}
      </p>
      <p className="mt-6 text-[17px] leading-8 text-zinc-300">{description}</p>
    </>
  );
}
