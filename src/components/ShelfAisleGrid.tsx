"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { Product } from "@/types";
import { ProductCard } from "@/components/ProductCard";
import { useLocale } from "@/hooks/useLocale";
import type { SceneId, ShelfGroupId } from "@/lib/product-meta";
import {
  SCENE_TONE,
  SHELF_GROUP_LABEL_KEYS,
  layoutShelfAisle,
} from "@/lib/product-meta";

/** 响应式网格：手机 1 列 → 平板 2 列 → 桌面 3 列 → 宽屏 4 列，auto-rows-fr 保证等高 */
const GRID =
  "grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 2xl:grid-cols-4 [grid-auto-rows:1fr]";

/** 货架过道：主卡平铺；重叠能力收入「更多同类」，不展示运营旁白。 */
export function ShelfAisleGrid({
  items,
  sceneId,
}: {
  items: Product[];
  sceneId?: SceneId | null;
}) {
  const { t } = useLocale();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const { main, altGroups } = layoutShelfAisle(items);
  const showGrouping = altGroups.length > 0;
  const groupMark = sceneId ? SCENE_TONE[sceneId].mark : "#7c5cff";

  if (!showGrouping) {
    return (
      <div className={GRID}>
        {items.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className={GRID}>
        {main.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>

      {altGroups.map((group) => {
        const open = openGroups[group.id] ?? false;
        const groupId = group.id as ShelfGroupId;
        return (
          <div
            key={group.id}
            className="shelf-pane overflow-hidden rounded-2xl backdrop-blur-md"
          >
            <button
              type="button"
              onClick={() =>
                setOpenGroups((prev) => ({ ...prev, [group.id]: !open }))
              }
              aria-expanded={open}
              className="ui-press flex w-full items-center justify-between gap-3 px-4 py-3 text-start hover:bg-white/[0.03]"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className="h-3.5 w-[3px] shrink-0 rounded-full"
                  style={{ background: groupMark }}
                  aria-hidden
                />
                <span className="text-sm font-medium text-zinc-200">
                  {t(SHELF_GROUP_LABEL_KEYS[groupId])}
                </span>
                <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[11px] tabular-nums text-zinc-500">
                  {group.items.length}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-1 text-xs text-[#a78bfa]">
                {open ? t("shelf.collapse") : t("shelf.expand")}
                <ChevronDown
                  className={`size-3.5 transition-transform duration-200 ${
                    open ? "rotate-180" : ""
                  }`}
                  aria-hidden
                />
              </span>
            </button>
            {open ? (
              <div className={`${GRID} px-4 pb-4 ui-fade-in`}>
                {group.items.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
