"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Building2,
  Clapperboard,
  Code2,
  Cpu,
  Layers3,
  Library,
  Radar,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
  Warehouse,
} from "lucide-react";
import Fuse from "fuse.js";
import Link from "next/link";
import { Header } from "@/components/Header";
import { ItemCard } from "@/components/ItemCard";
import { SiteFooter } from "@/components/SiteFooter";
import { ShelfAisleGrid } from "@/components/ShelfAisleGrid";
import { ShelfParticles } from "@/components/ShelfParticles";
import { DailyPickTrendChart } from "@/components/DailyPickTrendChart";
import ClickSpark from "@/components/react-bits/ClickSpark";
import { useCatalog } from "@/hooks/useCatalog";
import { useLocale } from "@/hooks/useLocale";
import { localizedCategoryLabel } from "@/lib/i18n/localize-copy";
import { categoryLabels } from "@/data/products";
import type { Category } from "@/types";
import type { MessageKey } from "@/lib/i18n/messages";
import type { SceneId } from "@/lib/product-meta";
import {
  SCENE_HINT_KEYS,
  SCENE_LABEL_KEYS,
  SCENE_TONE,
  SHELF_SCENES,
  resolveDelivery,
  sceneForProduct,
} from "@/lib/product-meta";
import {
  supportsFacade,
  type CatalogFacade,
} from "@/lib/unified-catalog";

/** 服务按钮之后的二级视图：服务库 / 编辑精选 / 场景集合 */
type SubView = "library" | "rank" | "collections";

const SUBVIEWS: {
  id: SubView;
  label: MessageKey;
  hint: MessageKey;
  icon: typeof Radar;
}[] = [
  {
    id: "library",
    label: "catalog.subview.library",
    hint: "catalog.subview.libraryHint",
    icon: Library,
  },
  {
    id: "rank",
    label: "catalog.subview.rank",
    hint: "catalog.subview.rankHint",
    icon: Sparkles,
  },
  {
    id: "collections",
    label: "catalog.subview.collections",
    hint: "catalog.subview.collectionsHint",
    icon: Layers3,
  },
];

const FACADES: {
  id: CatalogFacade;
  label: "catalog.facade.discover" | "catalog.facade.capability" | "catalog.facade.shelf";
  hint:
    | "catalog.facade.discoverHint"
    | "catalog.facade.capabilityHint"
    | "catalog.facade.shelfHint";
  icon: typeof Radar;
}[] = [
  {
    id: "discover",
    label: "catalog.facade.discover",
    hint: "catalog.facade.discoverHint",
    icon: Radar,
  },
  {
    id: "capability",
    label: "catalog.facade.capability",
    hint: "catalog.facade.capabilityHint",
    icon: Cpu,
  },
  {
    id: "shelf",
    label: "catalog.facade.shelf",
    hint: "catalog.facade.shelfHint",
    icon: Warehouse,
  },
];

/**
 * 编辑精选：跨能力域挑选的代表作（发现视图专属）。
 * id 失效时回退到产品列表前 6 项，保证区块永不空白。
 */
const EDITORS_PICKS: string[] = [
  "gpt-5.6-sol",
  "midjourney-api",
  "whisper-api",
  "runway-gen3",
  "langchain-pro",
  "cursor-pro",
];

function ProductsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { t, tf, locale } = useLocale();
  const initialScene = (searchParams.get("scene") as SceneId) || "all";
  const initialQuery = searchParams.get("q") || "";
  const requestedFacade = searchParams.get("view");
  const validCategories = useMemo(() => new Set(Object.keys(categoryLabels)), []);
  const requestedCategory = searchParams.get("cat");
  const initialCategory: Category | "all" =
    requestedCategory && validCategories.has(requestedCategory)
      ? (requestedCategory as Category)
      : "all";
  const initialFacade: CatalogFacade =
    requestedFacade === "capability" || requestedFacade === "shelf"
      ? requestedFacade
      : "discover";
  const requestedTab = searchParams.get("tab");
  const initialSubview: SubView =
    requestedTab === "rank" || requestedTab === "collections"
      ? requestedTab
      : "library";
  const [subview, setSubview] = useState<SubView>(initialSubview);
  const [facade, setFacade] = useState<CatalogFacade>(initialFacade);
  const [scene, setScene] = useState<SceneId | "all">(
    SHELF_SCENES.includes(initialScene) ? initialScene : "all"
  );
  const [category, setCategory] = useState<Category | "all">(initialCategory);
  const [liveOnly, setLiveOnly] = useState(searchParams.get("live") === "1");
  const [search, setSearch] = useState(initialQuery);
  const { products } = useCatalog();

  useEffect(() => {
    const params = new URLSearchParams();
    if (subview !== "library") params.set("tab", subview);
    if (subview === "library" && facade !== "discover") params.set("view", facade);
    if (scene !== "all") params.set("scene", scene);
    if (search.trim()) params.set("q", search.trim());
    if (subview === "library" && liveOnly && facade !== "capability")
      params.set("live", "1");
    if (subview === "library" && category !== "all" && facade !== "discover")
      params.set("cat", category);
    const qs = params.toString();
    const next = qs ? `${pathname}?${qs}` : pathname;
    const current = searchParams.toString()
      ? `${pathname}?${searchParams.toString()}`
      : pathname;
    if (next !== current) router.replace(next, { scroll: false });
  }, [subview, facade, scene, search, liveOnly, category, pathname, router, searchParams]);

  const fuse = useMemo(
    () =>
      new Fuse(products, {
        keys: ["name", "description", "tags", "provider"],
        threshold: 0.4,
        ignoreLocation: true,
      }),
    [products]
  );

  const filtered = useMemo(() => {
    let result = products.filter((product) => supportsFacade(product, facade));
    if (scene !== "all") {
      result = result.filter((p) => sceneForProduct(p) === scene);
    }
    if (liveOnly) {
      result = result.filter((p) => resolveDelivery(p) === "live");
    }
    if (category !== "all" && facade !== "discover") {
      result = result.filter((p) => p.category === category);
    }
    if (search.trim()) {
      const ids = new Set(fuse.search(search).map((r) => r.item.id));
      result = result.filter((p) => ids.has(p.id));
    }
    return result;
  }, [facade, scene, category, liveOnly, search, fuse, products]);

  /** 行业细分：按当前门面实际在售的分类动态生成（带数量），排序按规模降序 */
  const industryOptions = useMemo(() => {
    const counts = new Map<Category, number>();
    products.forEach((p) => {
      if (!supportsFacade(p, facade)) return;
      counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
    });
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([id, count]) => ({ id, count }));
  }, [products, facade]);

  /** 编辑精选：按 id 精选，失效回退前 6，避免空区块 */
  const editorPicks = useMemo(() => {
    const map = new Map(products.map((p) => [p.id, p]));
    const picks = EDITORS_PICKS.map((id) => map.get(id)).filter(
      (p): p is NonNullable<typeof p> => Boolean(p)
    );
    return picks.length >= Math.min(EDITORS_PICKS.length, 4)
      ? picks.slice(0, 6)
      : products.slice(0, 6);
  }, [products]);

  /** 集合视图（编辑精选 / 场景集合）内的搜索，复用同一份 fuse */
  const searchedProducts = useMemo(() => {
    if (!search.trim()) return products;
    const ids = new Set(fuse.search(search).map((r) => r.item.id));
    return products.filter((p) => ids.has(p.id));
  }, [search, fuse, products]);

  /** 场景集合：按使用场景分区，搜索时命中项才保留分区 */
  const collectionAisles = useMemo(() => {
    return SHELF_SCENES.map((sceneId) => ({
      id: sceneId,
      items: searchedProducts.filter((p) => sceneForProduct(p) === sceneId),
    })).filter((row) => row.items.length > 0);
  }, [searchedProducts]);

  const liveCount = useMemo(
    () => products.filter((product) => resolveDelivery(product) === "live").length,
    [products]
  );

  const aisles = useMemo(() => {
    if (scene !== "all" || search.trim()) {
      return [{ id: scene === "all" ? null : scene, items: filtered }];
    }
    return SHELF_SCENES.map((id) => ({
      id,
      items: filtered.filter((p) => sceneForProduct(p) === id),
    })).filter((row) => row.items.length > 0);
  }, [filtered, scene, search]);

  return (
    <ClickSpark
      sparkColor="#7c5cff"
      sparkSize={10}
      sparkRadius={22}
      sparkCount={14}
      duration={480}
      extraScale={1.08}
    >
      <div className="relative min-h-screen overflow-hidden bg-black text-zinc-100">
        <ShelfParticles color="124, 92, 255" count={42} />
        <div className="tech-grid pointer-events-none absolute inset-0 opacity-70" aria-hidden />

        {/* 柔光背景层：给毛玻璃卡片提供可透的色块，避免玻璃看起来像纯灰板 */}
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden"
          aria-hidden
        >
          <div className="absolute -top-40 -start-32 size-[34rem] rounded-full bg-[#7c5cff]/[0.13] blur-[110px]" />
          <div className="absolute top-[18%] -end-40 size-[30rem] rounded-full bg-cyan-400/[0.08] blur-[110px]" />
          <div className="absolute top-[22%] -end-24 size-[22rem] rounded-full bg-[#e08a3c]/[0.07] blur-[110px]" />
          <div className="absolute bottom-[-8rem] start-[28%] size-[28rem] rounded-full bg-[#2dd4bf]/[0.07] blur-[110px]" />
        </div>

        <div className="relative z-10">
          <Header />

          <div className="mx-auto max-w-[1560px] px-4 py-8 sm:px-6 lg:py-12">
            <header className="glass-lume overflow-hidden rounded-[28px] border border-white/[0.1] bg-white/[0.045] shadow-[0_28px_90px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
              <div className="grid gap-8 px-5 py-7 sm:px-8 sm:py-9 lg:grid-cols-[1fr_auto] lg:items-end lg:px-10">
                <div className="max-w-3xl">
                  <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#a78bfa]/80">
                    <Layers3 className="size-4" aria-hidden />
                    {t("catalog.oneCatalog")}
                  </p>
                  <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-zinc-50 sm:text-4xl lg:text-5xl">
                    {t("catalog.heroTitle")}
                  </h1>
                  <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400 sm:text-[15px]">
                    {t("catalog.heroLead")}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Link
                      href="/chat"
                      className="ui-press inline-flex min-h-10 items-center rounded-xl border border-white/10 bg-white/[0.04] px-3.5 text-xs font-medium text-zinc-300 transition-colors hover:border-amber-400/35 hover:bg-amber-400/10 hover:text-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70"
                    >
                      {t("shelf.askGuide")}
                    </Link>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    [products.length, t("catalog.metric.items")],
                    [liveCount, t("catalog.metric.live")],
                    [SHELF_SCENES.length, t("catalog.metric.scenes")],
                  ].map(([value, label]) => (
                    <div
                      key={String(label)}
                      className="min-w-20 rounded-2xl border border-white/[0.08] bg-black/25 px-3 py-3 text-center"
                    >
                      <p className="text-xl font-semibold tabular-nums text-white">{value}</p>
                      <p className="mt-1 text-[10px] text-zinc-500">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 border-t border-white/[0.07] bg-black/20 px-5 py-3 text-[11px] text-zinc-500 sm:px-8 lg:px-10">
                <ShieldCheck className="size-4 text-emerald-400/80" aria-hidden />
                {t("catalog.realData")}
              </div>
            </header>

            {/* 二级视图：服务库 / 编辑精选 / 场景集合（收在「服务」之后） */}
            <div
              className="mt-6 grid gap-2 sm:grid-cols-3"
              role="tablist"
              aria-label={t("nav.services")}
            >
              {SUBVIEWS.map((item) => {
                const active = subview === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => {
                      setSubview(item.id);
                      setSearch("");
                      if (item.id !== "library") setScene("all");
                    }}
                    className={`ui-press flex min-h-14 items-center gap-3 rounded-2xl border px-4 text-start transition-[border-color,background-color,transform,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black active:scale-[0.99] ${
                      active
                        ? "border-violet-400/50 bg-violet-400/[0.13] shadow-[0_14px_40px_rgba(124,92,255,0.1)]"
                        : "border-white/[0.08] bg-white/[0.035] hover:-translate-y-0.5 hover:border-white/[0.16] hover:bg-white/[0.055]"
                    }`}
                  >
                    <span
                      className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${
                        active ? "bg-violet-400/18 text-violet-200" : "bg-white/[0.05] text-zinc-500"
                      }`}
                    >
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <span>
                      <span className={`block text-sm font-medium ${active ? "text-white" : "text-zinc-300"}`}>
                        {t(item.label)}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-zinc-500">{t(item.hint)}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            {subview === "library" ? (
            <>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {FACADES.map((item) => {
                const active = facade === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      setFacade(item.id);
                      if (item.id === "capability") setLiveOnly(false);
                    }}
                    className={`ui-press flex min-h-16 items-center gap-3 rounded-2xl border px-4 text-start transition-[border-color,background-color,transform,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black active:scale-[0.99] ${
                      active
                        ? "border-violet-400/50 bg-violet-400/[0.13] shadow-[0_14px_40px_rgba(124,92,255,0.1)]"
                        : "border-white/[0.08] bg-white/[0.035] hover:-translate-y-0.5 hover:border-white/[0.16] hover:bg-white/[0.055]"
                    }`}
                  >
                    <span
                      className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${
                        active ? "bg-violet-400/18 text-violet-200" : "bg-white/[0.05] text-zinc-500"
                      }`}
                    >
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <span>
                      <span className={`block text-sm font-medium ${active ? "text-white" : "text-zinc-300"}`}>
                        {t(item.label)}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-zinc-500">{t(item.hint)}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            {/* 编辑精选：发现视图专属，跨能力域的代表作 */}
            {facade === "discover" ? (
              <div className="mt-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="h-px flex-1 bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />
                  <span className="text-xs font-medium uppercase tracking-widest text-violet-400/80">
                    {t("catalog.editorsPick")}
                  </span>
                  <span className="h-px flex-1 bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                  {editorPicks.map((product) => (
                    <Link
                      key={product.id}
                      href={`/products/${product.id}`}
                      className="group relative overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 transition-all duration-300 hover:border-violet-400/30 hover:bg-white/[0.06]"
                    >
                      <div className="flex items-center gap-2">
                        <div className="size-8 rounded-lg bg-gradient-to-br from-violet-500/20 to-cyan-500/20 flex items-center justify-center">
                          <Cpu className="size-4 text-violet-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-zinc-300 truncate group-hover:text-white">{product.provider}</p>
                          <p className="text-sm font-semibold text-zinc-100 truncate">{product.name}</p>
                        </div>
                      </div>
                      <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}

            {/* 每日精选 · 上升服务趋势图：发现视图专属 */}
            {facade === "discover" ? (
              <DailyPickTrendChart products={editorPicks} />
            ) : null}

            {/* 紧凑筛选区：场景选择 + 只看在线开关整合为一行 */}
            <div className="shelf-pane mt-4 rounded-2xl p-3 backdrop-blur-xl sm:p-4">
              {/* 第一行：场景选择（紧凑药丸）+ 只看在线开关 */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1">
                  <button
                    type="button"
                    aria-pressed={scene === "all"}
                    onClick={() => setScene("all")}
                    className={`ui-press shrink-0 rounded-md px-2.5 py-1 text-xs transition-all duration-200 ${
                      scene === "all"
                        ? "bg-[#7c5cff]/20 text-[#c4b5fd] border border-[#7c5cff]/30"
                        : "text-zinc-500 hover:bg-white/5 hover:text-zinc-300 border border-transparent"
                    }`}
                  >
                    {t("scene.allAisles")}
                  </button>
                  {SHELF_SCENES.slice(0, 4).map((s) => (
                    <button
                      key={s}
                      type="button"
                      aria-pressed={scene === s}
                      onClick={() => setScene(s)}
                      className={`ui-press shrink-0 rounded-md px-2.5 py-1 text-xs transition-all duration-200 ${
                        scene === s
                          ? SCENE_TONE[s].chip + " border border-current/20"
                          : "text-zinc-500 hover:bg-white/5 hover:text-zinc-300 border border-transparent"
                      }`}
                    >
                      {t(SCENE_LABEL_KEYS[s])}
                    </button>
                  ))}
                </div>
                {/* 只看在线开关 - 紧凑切换按钮 */}
                {facade !== "capability" && (
                  <button
                    type="button"
                    aria-pressed={liveOnly}
                    onClick={() => setLiveOnly(!liveOnly)}
                    className={`ui-press ml-auto shrink-0 flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-all duration-200 ${
                      liveOnly
                        ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-300"
                        : "border-white/[0.08] bg-white/[0.02] text-zinc-500 hover:border-white/[0.2] hover:text-zinc-300"
                    }`}
                  >
                    <span className={`size-1.5 rounded-full ${liveOnly ? "bg-emerald-400 animate-pulse" : "bg-zinc-600"}`} />
                    {t("shelf.liveOnly")}
                  </button>
                )}
              </div>

              {/* 展开更多场景（如果有超过4个） */}
              {SHELF_SCENES.length > 4 && (
                <details className="mt-2 group">
                  <summary className="cursor-pointer text-[11px] text-zinc-600 hover:text-zinc-400 select-none list-none">
                    + {SHELF_SCENES.length - 4} 更多场景
                  </summary>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {SHELF_SCENES.slice(4).map((s) => (
                      <button
                        key={s}
                        type="button"
                        aria-pressed={scene === s}
                        onClick={() => setScene(s)}
                        className={`ui-press shrink-0 rounded-md px-2.5 py-1 text-xs transition-all duration-200 ${
                          scene === s
                            ? SCENE_TONE[s].chip + " border border-current/20"
                            : "text-zinc-500 hover:bg-white/5 hover:text-zinc-300 border border-transparent"
                        }`}
                      >
                        {t(SCENE_LABEL_KEYS[s])}
                      </button>
                    ))}
                  </div>
                </details>
              )}

              {/* 行业细分：能力/货架视图专属，按在售分类紧凑筛选 */}
              {facade !== "discover" ? (
                <div className="mt-3 border-t border-white/[0.06] pt-3">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                    {t("catalog.industryFilter")}
                  </p>
                  <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
                    <button
                      type="button"
                      aria-pressed={category === "all"}
                      onClick={() => setCategory("all")}
                      className={`ui-press shrink-0 rounded-md border px-2.5 py-1 text-xs transition-colors ${
                        category === "all"
                          ? "border-violet-400/40 bg-violet-400/[0.12] text-violet-200"
                          : "border-white/[0.07] bg-white/[0.02] text-zinc-500 hover:border-white/[0.15] hover:text-zinc-300"
                      }`}
                    >
                      {t("common.all")}
                    </button>
                    {industryOptions.map((option) => {
                      const active = category === option.id;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          aria-pressed={active}
                          onClick={() => setCategory(active ? "all" : option.id)}
                          className={`ui-press flex shrink-0 items-center gap-1 rounded-md border px-2.5 py-1 text-xs transition-colors ${
                            active
                              ? "border-violet-400/40 bg-violet-400/[0.12] text-violet-200"
                              : "border-white/[0.07] bg-white/[0.02] text-zinc-500 hover:border-white/[0.15] hover:text-zinc-300"
                          }`}
                        >
                          {localizedCategoryLabel(option.id, locale)}
                          <span className="tabular-nums text-[10px] text-zinc-600">
                            {option.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {/* 搜索框 */}
              <div className="mt-3 flex items-center">
                <div className="relative flex-1">
                  <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t("shelf.searchPlaceholder")}
                    aria-label={t("shelf.searchAria")}
                    className="ui-focus-ring w-full rounded-lg border border-white/10 bg-black/30 py-2.5 pe-4 ps-10 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-[#7c5cff] focus:shadow-[0_0_0_3px_rgba(124,92,255,0.18)]"
                  />
                </div>
              </div>
            </div>

            <p className="mt-5 text-[13px] tabular-nums text-zinc-500">
              {tf("shelf.count", { n: filtered.length })}
            </p>

            {filtered.length === 0 ? (
              <p className="py-20 text-center text-zinc-500">
                {facade === "capability" ? t("catalog.noCapability") : t("shelf.empty")}{" "}
                {facade !== "capability" ? (
                  <Link
                    href="/chat"
                    className="text-[#a78bfa] underline hover:text-[#c4b5fd]"
                  >
                    {t("shelf.goGuide")}
                  </Link>
                ) : null}
              </p>
            ) : facade !== "shelf" ? (
              <div className="mt-5 grid grid-cols-1 gap-4 ui-fade-in sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 2xl:grid-cols-4 [grid-auto-rows:1fr]">
                {filtered.map((product) => (
                  <ItemCard key={product.id} product={product} facade={facade} />
                ))}
              </div>
            ) : (
              <div className="mt-5 space-y-10 ui-fade-in sm:space-y-12">
                {aisles.map((aisle) => {
                  const sceneId = aisle.id;
                  const tone = sceneId ? SCENE_TONE[sceneId] : null;
                  return (
                    <section key={sceneId || "all"} className="scroll-mt-24">
                      {sceneId && tone ? (
                        <div className="shelf-pane mb-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl px-4 py-3 backdrop-blur-xl">
                          <span
                            className="h-5 w-1 shrink-0 rounded-full"
                            style={{ background: tone.mark }}
                            aria-hidden
                          />
                          <h2 className="text-[15px] font-semibold tracking-tight text-zinc-50">
                            {t(SCENE_LABEL_KEYS[sceneId])}
                          </h2>
                          <p className="min-w-0 text-[12.5px] leading-5 text-zinc-500">
                            {t(SCENE_HINT_KEYS[sceneId])}
                          </p>
                          <span className="ms-auto shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] tabular-nums text-zinc-400">
                            {aisle.items.length}
                          </span>
                        </div>
                      ) : null}
                      <ShelfAisleGrid items={aisle.items} sceneId={sceneId} />
                    </section>
                  );
                })}
              </div>
            )}
            </>
            ) : null}

            {/* 编辑精选：交付清晰、说明完整的服务，带集合内搜索 */}
            {subview === "rank" ? (
              <div className="mt-6">
                <div className="shelf-pane rounded-2xl p-3 backdrop-blur-xl sm:p-4">
                  <p className="mb-3 flex items-center gap-2 text-xs leading-5 text-zinc-500">
                    <ShieldCheck className="size-4 shrink-0 text-emerald-400/80" aria-hidden />
                    {t("catalog.rankRule")}
                  </p>
                  <div className="relative">
                    <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder={t("catalog.search.rank")}
                      aria-label={t("catalog.search.rank")}
                      className="ui-focus-ring w-full rounded-lg border border-white/10 bg-black/30 py-2.5 pe-4 ps-10 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-[#7c5cff] focus:shadow-[0_0_0_3px_rgba(124,92,255,0.18)]"
                    />
                  </div>
                </div>
                <p className="mt-5 text-[13px] tabular-nums text-zinc-500">
                  {tf("shelf.count", { n: searchedProducts.length })}
                </p>
                {searchedProducts.length === 0 ? (
                  <p className="py-20 text-center text-zinc-500">{t("shelf.empty")}</p>
                ) : (
                  <div className="mt-5 grid grid-cols-1 gap-4 ui-fade-in sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 2xl:grid-cols-4 [grid-auto-rows:1fr]">
                    {searchedProducts.slice(0, 24).map((product) => (
                      <ItemCard key={product.id} product={product} facade="discover" />
                    ))}
                  </div>
                )}
              </div>
            ) : null}

            {/* 场景集合：按使用场景分区，带集合内搜索 */}
            {subview === "collections" ? (
              <div className="mt-6">
                <div className="shelf-pane rounded-2xl p-3 backdrop-blur-xl sm:p-4">
                  <div className="relative">
                    <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder={t("catalog.search.collections")}
                      aria-label={t("catalog.search.collections")}
                      className="ui-focus-ring w-full rounded-lg border border-white/10 bg-black/30 py-2.5 pe-4 ps-10 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-[#7c5cff] focus:shadow-[0_0_0_3px_rgba(124,92,255,0.18)]"
                    />
                  </div>
                </div>
                {collectionAisles.length === 0 ? (
                  <p className="py-20 text-center text-zinc-500">{t("shelf.empty")}</p>
                ) : (
                  <div className="mt-6 space-y-8">
                    {collectionAisles.map((aisle) => {
                      const tone = SCENE_TONE[aisle.id];
                      return (
                        <section
                          key={aisle.id}
                          className="overflow-hidden rounded-[24px] border border-white/[0.09] bg-white/[0.035] p-4 backdrop-blur-xl sm:p-6"
                        >
                          <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span
                              className="h-6 w-1 rounded-full"
                              style={{ background: tone.mark }}
                              aria-hidden
                            />
                            <h2 className="text-lg font-semibold text-white">
                              {t(SCENE_LABEL_KEYS[aisle.id])}
                            </h2>
                            <p className="text-xs text-zinc-500">
                              {t(SCENE_HINT_KEYS[aisle.id])}
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                setSubview("library");
                                setFacade("discover");
                                setSearch("");
                                setScene(aisle.id);
                              }}
                              className="ui-press ms-auto text-xs font-medium text-violet-300 hover:text-violet-200 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/70"
                            >
                              {t("catalog.facade.discover")} →
                            </button>
                          </div>
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 [grid-auto-rows:1fr]">
                            {aisle.items.slice(0, 4).map((product) => (
                              <ItemCard key={product.id} product={product} facade="discover" />
                            ))}
                          </div>
                        </section>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : null}

            <section className="mt-16 border-t border-white/[0.08] pt-10">
              <div className="max-w-2xl">
                <h2 className="text-2xl font-semibold tracking-tight text-white">
                  {t("catalog.audienceTitle")}
                </h2>
                <p className="mt-2 text-sm leading-6 text-zinc-500">
                  {t("catalog.audienceLead")}
                </p>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {(
                  [
                    {
                      label: "catalog.audience.personal",
                      description: "catalog.audience.personalDesc",
                      href: "/products?view=discover",
                      icon: UserRound,
                      color: "#a78bfa",
                    },
                    {
                      label: "catalog.audience.developer",
                      description: "catalog.audience.developerDesc",
                      href: "/products?view=capability&scene=dev",
                      icon: Code2,
                      color: "#4ade80",
                    },
                    {
                      label: "catalog.audience.business",
                      description: "catalog.audience.businessDesc",
                      href: "/products?tab=collections",
                      icon: Building2,
                      color: "#38bdf8",
                    },
                    {
                      label: "catalog.audience.creator",
                      description: "catalog.audience.creatorDesc",
                      href: "/products?scene=content",
                      icon: Clapperboard,
                      color: "#f472b6",
                    },
                  ] as const
                ).map((audience) => {
                  const Icon = audience.icon;
                  return (
                    <Link
                      key={audience.label}
                      href={audience.href}
                      className="ui-press group rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4 backdrop-blur-xl transition-[border-color,background-color,transform] duration-200 hover:-translate-y-1 hover:border-white/[0.16] hover:bg-white/[0.055] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/70"
                    >
                      <span
                        className="flex size-10 items-center justify-center rounded-xl border border-white/[0.08] bg-black/25"
                        style={{ color: audience.color }}
                      >
                        <Icon className="size-5" aria-hidden />
                      </span>
                      <h3 className="mt-4 text-sm font-semibold text-zinc-100">
                        {t(audience.label)}
                      </h3>
                      <p className="mt-2 text-xs leading-5 text-zinc-500">
                        {t(audience.description)}
                      </p>
                    </Link>
                  );
                })}
              </div>
            </section>
          </div>
          <SiteFooter />
        </div>
      </div>
    </ClickSpark>
  );
}

function ProductsFallback() {
  const { t } = useLocale();
  return <div className="p-20 text-center text-zinc-500">{t("common.loading")}</div>;
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<ProductsFallback />}>
      <ProductsContent />
    </Suspense>
  );
}
