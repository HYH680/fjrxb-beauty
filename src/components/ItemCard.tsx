"use client";

import Link from "next/link";
import { ArrowUpRight, Bot, Check, Compass, Radio } from "lucide-react";
import type { Product } from "@/types";
import { AddToCartButton } from "@/components/AddToCartButton";
import { ProductCard } from "@/components/ProductCard";
import { ProductCover } from "@/components/ProductCover";
import { formatPrice } from "@/lib/format";
import { useLocale } from "@/hooks/useLocale";
import { useSubscriptions } from "@/hooks/useSubscriptions";
import {
  localizedProductDescription,
  localizedProductFeatures,
  localizedProductName,
} from "@/lib/i18n/localize-copy";
import {
  deliveryBadgeClass,
  deliveryLabelKey,
  SCENE_LABEL_KEYS,
  SCENE_TONE,
} from "@/lib/product-meta";
import {
  toUnifiedCatalogItem,
  type CatalogFacade,
} from "@/lib/unified-catalog";

export function ItemCard({
  product,
  facade,
}: {
  product: Product;
  facade: CatalogFacade;
}) {
  const { t, locale } = useLocale();
  const { isActive } = useSubscriptions();
  if (facade === "shelf") return <ProductCard product={product} />;

  const item = toUnifiedCatalogItem(product);
  const name = localizedProductName(product, locale);
  const description = localizedProductDescription(product, locale);
  const features = localizedProductFeatures(product, locale).slice(0, 3);
  const tone = SCENE_TONE[item.scene];

  if (facade === "discover") {
    return (
      <article className="glass-lume group flex h-full flex-col overflow-hidden rounded-2xl border border-white/[0.09] bg-white/[0.045] backdrop-blur-xl transition-[border-color,background-color,transform,box-shadow] duration-300 hover:-translate-y-1 hover:border-cyan-300/25 hover:bg-white/[0.065]">
        <Link
          href={item.discovery.detailHref}
          className="relative block overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-400"
          aria-label={`${t("catalog.action.details")}：${name}`}
        >
          <ProductCover product={product} className="rounded-none" />
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#0d0d12] to-transparent" />
          <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/55 px-2.5 py-1 text-[11px] text-zinc-300 backdrop-blur-md">
            <Compass className="size-3" aria-hidden />
            {t(SCENE_LABEL_KEYS[item.scene])}
          </span>
        </Link>

        <div className="flex flex-1 flex-col p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-[0.13em] text-zinc-500">
                {product.provider}
              </p>
              <h2 className="mt-1 text-base font-semibold tracking-tight text-zinc-50">
                {name}
              </h2>
            </div>
            <span
              className="mt-1 size-2 shrink-0 rounded-full"
              style={{ background: tone.mark }}
              aria-hidden
            />
          </div>
          <p className="mt-3 line-clamp-3 text-sm leading-6 text-zinc-400">{description}</p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {product.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-md border border-white/[0.07] bg-black/20 px-2 py-1 text-[11px] text-zinc-500"
              >
                {tag}
              </span>
            ))}
          </div>
          <Link
            href={item.discovery.detailHref}
            className="ui-press mt-auto inline-flex min-h-11 items-center justify-between gap-2 pt-5 text-sm font-medium text-violet-300 transition-colors hover:text-violet-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          >
            {t("catalog.action.details")}
            <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>
      </article>
    );
  }

  return (
    <article className="glass-lume group relative flex h-full flex-col overflow-hidden rounded-2xl border border-emerald-400/[0.14] bg-[linear-gradient(155deg,rgba(16,185,129,0.08),rgba(255,255,255,0.035)_45%,rgba(0,0,0,0.2))] p-5 backdrop-blur-xl transition-[border-color,transform,box-shadow] duration-300 hover:-translate-y-1 hover:border-emerald-300/[0.3]">
      <div className="flex items-start justify-between gap-4">
        <div
          className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-emerald-300/20 bg-emerald-400/10 text-emerald-300"
          aria-hidden
        >
          <Bot className="size-5" />
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${deliveryBadgeClass(item.capability.delivery)}`}
        >
          <Radio className="size-3" aria-hidden />
          {t(deliveryLabelKey(item.capability.delivery, product.badge))}
        </span>
      </div>

      <p className="mt-5 text-[11px] uppercase tracking-[0.13em] text-zinc-500">
        {item.capability.provider}
        {item.capability.model ? ` · ${item.capability.model}` : ""}
      </p>
      <h2 className="mt-1 text-base font-semibold tracking-tight text-zinc-50">{name}</h2>
      <p className="mt-3 line-clamp-2 text-sm leading-6 text-zinc-400">{description}</p>

      <ul className="mt-4 space-y-2">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-xs leading-5 text-zinc-300">
            <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-300" aria-hidden />
            <span className="line-clamp-1">{feature}</span>
          </li>
        ))}
      </ul>

      <div className="mt-auto flex items-end justify-between gap-3 border-t border-white/[0.07] pt-5">
        <p className="text-lg font-semibold text-zinc-50">
          {formatPrice(item.commerce.price)}
          <span className="ml-1 text-[11px] font-normal text-zinc-500">
            / {item.commerce.unit}
          </span>
        </p>
        <div className="flex items-center gap-2">
          {isActive(product.id) ? (
            <Link
              href={item.capability.workspaceHref}
              className="ui-press inline-flex min-h-9 items-center rounded-lg border border-emerald-300/20 bg-emerald-400/10 px-3 text-xs font-medium text-emerald-200 transition-colors hover:bg-emerald-400/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70"
            >
              {t("catalog.action.try")}
            </Link>
          ) : (
            <Link
              href={item.discovery.detailHref}
              className="ui-press inline-flex min-h-9 items-center rounded-lg border border-white/15 bg-white/[0.06] px-3 text-xs font-medium text-zinc-200 transition-colors hover:bg-white/[0.1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/70"
            >
              {t("catalog.action.details")}
            </Link>
          )}
          <AddToCartButton product={product} size="sm" />
        </div>
      </div>
    </article>
  );
}
