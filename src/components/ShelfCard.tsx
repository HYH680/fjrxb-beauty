"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import type { Product } from "@/types";
import { ProductCover } from "@/components/ProductCover";
import { ShelfGlowCard } from "@/components/ShelfGlowCard";
import { formatPrice } from "@/lib/format";
import { useLocale } from "@/hooks/useLocale";
import {
  localizedProductDescription,
  localizedProductFeatures,
  localizedProductName,
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
  shelfActionHref,
  shelfActionLabelKey,
} from "@/lib/product-meta";
import { AddToCartButton } from "./AddToCartButton";

function unitLabel(unit: string, t: (key: "common.perMonth") => string) {
  if (!unit || !unit.trim()) return "";
  return unit === "每月" ? t("common.perMonth") : unit;
}

/** 安全取价：products.ts 是手写数据，缺价时兜底 0 而不是让 toLocaleString 抛错 */
function safePrice(price: number | null | undefined) {
  return typeof price === "number" && Number.isFinite(price) ? price : 0;
}

/**
 * 服务卡：五段式分块 —— 封面 / 头部 / 简介 / 能力 / 价格操作。
 * 每段有明确的视觉边界，简介独立成玻璃内嵌块，保证不同长度的文案也能等高对齐。
 */
export function ShelfCard({
  product,
  compact = false,
  showActions = true,
}: {
  product: Product;
  compact?: boolean;
  showActions?: boolean;
}) {
  const { t, locale } = useLocale();
  const delivery = resolveDelivery(product);
  const scene = sceneForProduct(product);
  const kind = productKind(product);
  const tone = SCENE_TONE[scene];
  const href = `/tools/${product.id}`;
  const name = localizedProductName(product, locale);
  const description = (localizedProductDescription(product, locale) || "").trim();
  const allFeatures = localizedProductFeatures(product, locale);
  const maxFeatures = compact ? 2 : 3;
  const highlights = allFeatures.slice(0, maxFeatures);
  const restCount = Math.max(0, allFeatures.length - highlights.length);
  const unit = unitLabel(product.unit, t);
  const price = safePrice(product.price);

  const titleNode = (
    <h3 className="text-[15px] font-semibold leading-snug tracking-tight text-zinc-50 transition-colors duration-200 group-hover/card:text-[#c4b5fd]">
      {name}
    </h3>
  );

  const body = (
    <ShelfGlowCard accent={tone.mark} className="h-full">
      <article className="relative flex h-full flex-col overflow-hidden">
        {/* 场景色轨：卡片左侧的分区锚点 */}
        <span
          className="pointer-events-none absolute inset-y-0 start-0 z-30 w-[3px]"
          style={{
            background: `linear-gradient(180deg, ${tone.mark} 0%, ${tone.mark} 55%, transparent 100%)`,
          }}
          aria-hidden
        />
        {/* 玻璃网格纹理 */}
        <div
          className="shelf-glass-grain pointer-events-none absolute inset-0 z-0"
          aria-hidden
        />

        {/* ① 封面区 */}
        <div className="relative z-10 overflow-hidden">
          <div className="transition-transform duration-[600ms] ease-out group-hover/card:scale-[1.045]">
            {showActions ? (
              <Link
                href={href}
                className="block ps-[3px]"
                aria-label={name}
                tabIndex={-1}
              >
                <ProductCover product={product} className="rounded-none" />
              </Link>
            ) : (
              <div className="ps-[3px]">
                <ProductCover product={product} className="rounded-none" />
              </div>
            )}
          </div>

          {/* 封面顶部渐隐，保证状态胶囊可读 */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-black/55 to-transparent"
            aria-hidden
          />

          {/* 交付状态：玻璃胶囊 */}
          <div className="absolute end-2.5 top-2.5 z-20">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/35 px-2.5 py-1 text-[11px] font-medium backdrop-blur-md ${deliveryBadgeClass(delivery)}`}
            >
              <span className="size-1.5 rounded-full bg-current" aria-hidden />
              {t(deliveryLabelKey(delivery, product.badge))}
            </span>
          </div>
        </div>

        {/* ② 头部区：场景 · 类型 · 标题 */}
        <div className="relative z-10 flex flex-col gap-2 px-4 pb-1 pt-3.5 ps-5">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
            <span className="inline-flex min-w-0 items-center gap-1.5 font-medium text-zinc-300">
              <span
                className="size-1.5 shrink-0 rounded-full"
                style={{ background: tone.mark }}
                aria-hidden
              />
              <span className="truncate">{t(SCENE_LABEL_KEYS[scene])}</span>
            </span>
            <span className="text-zinc-700" aria-hidden>
              ·
            </span>
            <span className="truncate text-zinc-500">
              {t(productKindLabelKey(kind))}
            </span>
          </div>

          {showActions ? (
            <Link href={href} className="block">
              {titleNode}
            </Link>
          ) : (
            titleNode
          )}
        </div>

        {/* ③ 简介区：独立玻璃内嵌块 */}
        {description ? (
          <div className="relative z-10 px-4 pt-2.5 ps-5">
            <div className="relative overflow-hidden rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2.5">
              <span
                className="absolute inset-y-2 start-0 w-[2px] rounded-full"
                style={{ background: tone.mark, opacity: 0.55 }}
                aria-hidden
              />
              <p
                className={`text-[12.5px] leading-5 text-zinc-400 ${
                  compact ? "line-clamp-2" : "line-clamp-3"
                }`}
              >
                {description}
              </p>
            </div>
          </div>
        ) : null}

        {/* ④ 能力清单 */}
        {highlights.length > 0 ? (
          <ul className="relative z-10 space-y-1.5 px-4 pt-3 ps-5">
            {highlights.map((feat) => (
              <li
                key={feat}
                className="flex items-start gap-2 text-[12px] leading-5 text-zinc-300"
              >
                <span
                  className="mt-[3px] flex size-3.5 shrink-0 items-center justify-center rounded-full"
                  style={{
                    background: `color-mix(in srgb, ${tone.mark} 22%, transparent)`,
                    color: tone.mark,
                  }}
                >
                  <Check className="size-2.5" strokeWidth={3} />
                </span>
                <span className="line-clamp-1">{feat}</span>
              </li>
            ))}
            {restCount > 0 ? (
              <li className="ps-[22px] text-[11px] text-zinc-600">
                +{restCount}
              </li>
            ) : null}
          </ul>
        ) : null}

        {/* ⑤ 底部区：价格 + 操作 */}
        {showActions ? (
          <div className="relative z-10 mt-auto border-t border-white/[0.07] bg-black/25 px-4 py-3 ps-5">
            <div className="flex items-center justify-between gap-3">
              <p className="min-w-0 truncate text-[17px] font-semibold tracking-tight text-zinc-50">
                <span className="tabular-nums">{formatPrice(price)}</span>
                {unit ? (
                  <span className="ms-1 text-[11px] font-normal text-zinc-500">
                    / {unit}
                  </span>
                ) : null}
              </p>

              <div className="flex shrink-0 items-center gap-2.5">
                <Link
                  href={shelfActionHref(product.id, delivery, product.badge)}
                  className="ui-press whitespace-nowrap text-[12px] text-[#a78bfa] hover:text-[#c4b5fd] hover:underline"
                >
                  {t(shelfActionLabelKey(delivery, product.badge))}
                </Link>
                <AddToCartButton product={product} size="sm" />
              </div>
            </div>
          </div>
        ) : null}
      </article>
    </ShelfGlowCard>
  );

  if (!showActions) {
    return (
      <Link href={href} className="group/card block h-full">
        {body}
      </Link>
    );
  }

  return body;
}
