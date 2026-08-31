"use client";

import { useEffect } from "react";
import type { Product } from "@/types";
import { ProductActions } from "@/components/ProductActions";
import { ProductCard } from "@/components/ProductCard";
import { useLocale } from "@/hooks/useLocale";
import { formatPrice } from "@/lib/format";
import {
  localizedProductFeatures,
  localizedProductName,
  localizedProvider,
  preferEnglishCopy,
} from "@/lib/i18n/localize-copy";
import { getServiceBrief } from "@/lib/service-briefs";
import { attachedSkillsForProduct } from "@/lib/service-skills";
import type { DeliveryStatus } from "@/lib/product-meta";

export function ProductDetailBody({
  product,
  live,
  liveLabel,
  delivery,
  related,
}: {
  product: Product;
  live: boolean;
  liveLabel: string;
  delivery: DeliveryStatus;
  related: Product[];
}) {
  const { t, tf, locale } = useLocale();
  const preferEn = preferEnglishCopy(locale);
  const brief = getServiceBrief(product.id);
  const name = localizedProductName(product, locale);
  const provider = localizedProvider(product.provider, locale);
  const modelLabelRaw = liveLabel || t("detail.liveModelFallback");
  const modelLabel = preferEn
    ? /[\u4e00-\u9fff]/.test(modelLabelRaw)
      ? localizedProvider(modelLabelRaw, locale).replace(/看图/g, "Vision").replace(/无图/g, "text")
      : modelLabelRaw
    : modelLabelRaw;
  // If still Chinese after map, fall back.
  const modelShown =
    preferEn && /[\u4e00-\u9fff]/.test(modelLabel)
      ? t("detail.liveModelFallback")
      : modelLabel;
  const unit =
    product.unit === "每月" ? t("common.perMonth") : product.unit;

  useEffect(() => {
    const brand = t("brand.name");
    document.title = `${name} · ${brand}`;
  }, [name, t]);

  const howKey =
    brief.kind === "vision-run"
      ? "detail.howVision"
      : brief.kind === "cs-ops"
        ? "detail.howCs"
        : "detail.howDefault";

  let accessNote = "";
  if (product.access === "customer") {
    if (delivery === "playbook") {
      accessNote = tf("detail.accessPlaybookCustomer", {
        provider,
      });
    } else if (live) {
      accessNote = tf("detail.accessLiveCustomer", {
        model: modelShown,
        provider,
      });
    } else {
      accessNote = tf("detail.accessOfflineCustomer", {
        provider,
      });
    }
  } else if (product.access === "platform") {
    if (delivery === "playbook") {
      accessNote = t("detail.accessPlaybookPlatform");
    } else if (delivery === "setup") {
      // Keep setup/proxy specifics in Chinese data out of EN UI; use generic setup copy.
      accessNote = t("detail.accessSetupGeneric");
    } else if (live) {
      accessNote = tf("detail.accessLivePlatform", {
        model: modelShown,
        provider,
      });
    } else {
      accessNote = t("detail.accessOfflinePlatform");
    }
  }

  const features = localizedProductFeatures(product, locale);
  const featureLine = features.length
    ? tf("detail.includes", {
        items: features.join(preferEn ? ", " : "、"),
      })
    : null;

  return (
    <>
      {product.longDescription &&
      product.longDescription !== product.description ? (
        <p className="mt-6 text-sm leading-7 text-zinc-400">
          {product.longDescription}
        </p>
      ) : null}

      {accessNote ? (
        <p className="mt-4 rounded-lg border border-white/10 bg-[#12151c] px-4 py-3 text-sm leading-6 text-zinc-400">
          {accessNote}
        </p>
      ) : null}

      <div className="mt-8 rounded-2xl border border-white/10 bg-[#12151c] px-5 py-5">
        <p className="text-sm text-zinc-500">{t("detail.howTitle")}</p>
        <p className="mt-2 text-[15px] leading-7 text-zinc-300">{t(howKey)}</p>
        {!preferEn ? (
          <>
            <ul className="mt-3 space-y-1 text-sm text-zinc-400">
              {brief.materials.map((item) => (
                <li key={item.label}>
                  {item.required ? "要准备" : "可后补"}：{item.label}
                  {item.hint ? `（${item.hint}）` : ""}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-zinc-500">{brief.customerDoes}</p>
            <p className="mt-3 text-xs text-zinc-600">
              挂接{" "}
              {attachedSkillsForProduct(product)
                .map((s) => s.label)
                .join(" · ")}
            </p>
          </>
        ) : null}
      </div>

      {features.length > 0 ? (
        <ul className="mt-8 grid gap-2 sm:grid-cols-2">
          {features.map((f) => (
            <li key={f} className="text-sm text-zinc-400">
              {f}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-10 border-t border-white/5 pt-8">
        <p className="text-sm text-zinc-500">{t("detail.pricing")}</p>
        <p className="mt-2 text-3xl tracking-tight">
          {formatPrice(product.price)}
          <span className="ms-2 text-base text-zinc-500">/ {unit}</span>
        </p>
        {featureLine || (!preferEn && product.pricingNote) ? (
          <p className="mt-3 max-w-md text-sm leading-6 text-zinc-400">
            {featureLine}
            {!preferEn ? product.pricingNote : null}
          </p>
        ) : null}
        <ProductActions product={product} live={live} />
      </div>

      {related.length > 0 ? (
        <section className="mt-16">
          <h2 className="text-2xl font-semibold tracking-tight">
            {t("detail.related")}
          </h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} compact />
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
