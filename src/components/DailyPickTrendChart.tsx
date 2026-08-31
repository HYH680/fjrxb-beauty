"use client";

import { useMemo } from "react";
import Link from "next/link";
import { TrendingUp } from "lucide-react";
import type { Product } from "@/types";
import { useLocale } from "@/hooks/useLocale";
import { SCENE_TONE, sceneForProduct } from "@/lib/product-meta";

/**
 * 每日精选 · 上升服务趋势图。
 *
 * 项目当前没有真实的浏览 / 开通热度时间序列，为避免谎称销量，
 * 这里用产品 id 派生的**确定性伪造数据**画出近 7 天上升曲线，
 * 并在标题旁明确标注「示例趋势」。数据每次渲染一致（同一 id → 同一曲线），
 * 后端接入真实统计后，只需把 `series` / `deltaPct` 换成接口数据即可。
 */

const DAYS = 7;

/** 32-bit FNV-1a：把字符串散列成稳定整数，作为伪随机种子 */
function hashSeed(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32：由种子生成可复现的 [0,1) 伪随机序列 */
function makeRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 生成一条整体上升、带小幅抖动的 7 日序列（0~1 归一化） */
function buildSeries(seed: number): { series: number[]; deltaPct: number } {
  const rand = makeRandom(seed);
  const start = 0.18 + rand() * 0.22; // 起点低
  const gain = 0.34 + rand() * 0.4; // 总涨幅
  const raw: number[] = [];
  for (let i = 0; i < DAYS; i += 1) {
    const progress = i / (DAYS - 1);
    const jitter = (rand() - 0.5) * 0.12;
    raw.push(Math.min(1, Math.max(0.04, start + gain * progress + jitter)));
  }
  // 保证末点为区间最高，凸显「上升」
  raw[DAYS - 1] = Math.max(...raw, raw[DAYS - 1]);
  const deltaPct = Math.round(((raw[DAYS - 1] - raw[0]) / Math.max(raw[0], 0.04)) * 100);
  return { series: raw, deltaPct: Math.max(8, Math.min(deltaPct, 240)) };
}

function Sparkline({ series, color }: { series: number[]; color: string }) {
  const w = 120;
  const h = 34;
  const pad = 3;
  const step = (w - pad * 2) / (series.length - 1);
  const points = series.map((v, i) => {
    const x = pad + i * step;
    const y = h - pad - v * (h - pad * 2);
    return [x, y] as const;
  });
  const line = points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${pad},${h - pad} ${line} ${(w - pad).toFixed(1)},${h - pad}`;
  const last = points[points.length - 1];
  const gid = `spark-${Math.round(points[0][1])}-${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="h-8 w-full"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${gid})`} />
      <polyline
        points={line}
        fill="none"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={last[0]} cy={last[1]} r="2.4" fill={color} />
    </svg>
  );
}

export function DailyPickTrendChart({ products }: { products: Product[] }) {
  const { t, tf } = useLocale();

  const rows = useMemo(() => {
    return products
      .slice(0, 5)
      .map((product) => {
        const scene = sceneForProduct(product);
        const tone = scene ? SCENE_TONE[scene] : null;
        const { series, deltaPct } = buildSeries(hashSeed(product.id));
        return {
          product,
          series,
          deltaPct,
          color: tone?.mark ?? "#7c5cff",
        };
      })
      .sort((a, b) => b.deltaPct - a.deltaPct);
  }, [products]);

  if (rows.length === 0) return null;

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-white/[0.09] bg-white/[0.035] p-4 backdrop-blur-xl sm:p-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-violet-400/15 text-violet-300">
          <TrendingUp className="size-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-zinc-100">
            {t("catalog.trend.title")}
          </h2>
          <p className="text-[11px] text-zinc-500">{t("catalog.trend.lead")}</p>
        </div>
        <span className="ms-auto shrink-0 rounded-full border border-white/10 bg-black/25 px-2 py-0.5 text-[10px] uppercase tracking-wider text-zinc-500">
          {t("catalog.trend.sample")}
        </span>
      </div>

      <ol className="mt-4 space-y-1">
        {rows.map((row, index) => (
          <li key={row.product.id}>
            <Link
              href={`/products/${row.product.id}`}
              className="group grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-white/[0.05] sm:grid-cols-[auto_minmax(0,1fr)_130px_auto]"
            >
              <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-white/[0.05] text-[11px] font-semibold tabular-nums text-zinc-400">
                {index + 1}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[10px] text-zinc-500">
                  {row.product.provider}
                </span>
                <span className="block truncate text-sm font-medium text-zinc-200 group-hover:text-white">
                  {row.product.name}
                </span>
              </span>
              <span className="hidden sm:block">
                <Sparkline series={row.series} color={row.color} />
              </span>
              <span
                className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums"
                style={{ color: row.color, backgroundColor: `${row.color}1f` }}
              >
                {tf("catalog.trend.up", { n: row.deltaPct })}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
