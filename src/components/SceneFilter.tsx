"use client";

import type { SceneId } from "@/lib/product-meta";
import { SCENE_LABEL_KEYS, SCENE_TONE, SHELF_SCENES } from "@/lib/product-meta";
import { useLocale } from "@/hooks/useLocale";

export function SceneFilter({
  selected,
  onChange,
}: {
  selected: SceneId | "all";
  onChange: (scene: SceneId | "all") => void;
}) {
  const { t } = useLocale();

  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:flex-wrap lg:overflow-visible">
      <button
        type="button"
        aria-pressed={selected === "all"}
        onClick={() => onChange("all")}
        className={`ui-press shrink-0 rounded-md px-3 py-1.5 text-sm transition-all duration-200 ${
          selected === "all"
            ? "bg-[#7c5cff]/20 text-[#c4b5fd]"
            : "text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
        }`}
      >
        {t("scene.allAisles")}
      </button>
      {SHELF_SCENES.map((scene) => (
        <button
          key={scene}
          type="button"
          aria-pressed={selected === scene}
          onClick={() => onChange(scene)}
          className={`ui-press shrink-0 rounded-md px-3 py-1.5 text-sm transition-all duration-200 ${
            selected === scene
              ? SCENE_TONE[scene].chip
              : "text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
          }`}
        >
          {t(SCENE_LABEL_KEYS[scene])}
        </button>
      ))}
    </div>
  );
}
