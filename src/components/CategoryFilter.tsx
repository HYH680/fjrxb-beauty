"use client";

import type { Category } from "@/types";
import { categoryLabels } from "@/data/products";

interface CategoryFilterProps {
  selected: Category | "all";
  onChange: (category: Category | "all") => void;
}

/** 次要筛选：方向标签，不作为主浏览入口 */
export function CategoryFilter({ selected, onChange }: CategoryFilterProps) {
  const categories: (Category | "all")[] = [
    "all",
    "creative",
    "we-media",
    "ecommerce",
    "video-edit",
    "retail",
    "llm",
    "image",
    "speech",
    "dev-tools",
    "vector-db",
    "api",
    "docs",
    "finance",
    "education",
    "hr",
  ];

  return (
    <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 lg:flex-wrap lg:overflow-visible">
      {categories.map((cat) => (
        <button
          key={cat}
          type="button"
          onClick={() => onChange(cat)}
          className={`shrink-0 rounded-md px-2.5 py-1 text-xs transition-colors ${
            selected === cat
              ? "bg-white/10 text-zinc-100"
              : "text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
          }`}
        >
          {cat === "all" ? "全部" : categoryLabels[cat]}
        </button>
      ))}
    </div>
  );
}
