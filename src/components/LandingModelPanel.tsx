"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Maximize2 } from "lucide-react";
import {
  SHOWCASE_MODELS,
  showcaseRegion,
  type ShowcaseKind,
  type ShowcaseModel,
} from "@/lib/showcase-models";
import { useLocale } from "@/hooks/useLocale";
import type { MessageKey } from "@/lib/i18n/messages";

type Tab = "all" | ShowcaseKind;

const TAB_KEYS: { id: Tab; key: MessageKey }[] = [
  { id: "all", key: "landing.tabAll" },
  { id: "chat", key: "landing.tabChat" },
  { id: "vision", key: "landing.tabVision" },
  { id: "image", key: "landing.tabImage" },
  { id: "voice", key: "landing.tabVoice" },
  { id: "video", key: "landing.tabVideo" },
  { id: "audio", key: "landing.tabAudio" },
];

function ModelRow({
  model,
  preferEn,
}: {
  model: ShowcaseModel;
  preferEn: boolean;
}) {
  return (
    <li className="rounded-lg border border-white/6 bg-white/[0.03] px-3 py-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium text-zinc-100">
          {preferEn && model.labelEn ? model.labelEn : model.label}
        </span>
        <span className="shrink-0 text-[11px] text-zinc-500">
          {preferEn && model.brandEn ? model.brandEn : model.brand}
        </span>
      </div>
      <p className="mt-1 text-[12px] leading-5 text-zinc-500">
        {preferEn && model.whyEn ? model.whyEn : model.why}
      </p>
      {model.model ? (
        <p className="mt-1.5 font-mono text-[11px] text-zinc-600">{model.model}</p>
      ) : null}
    </li>
  );
}

/** macOS / React Bits–style window: lists domestic supported models. */
export function LandingModelPanel() {
  const { t, tf, locale } = useLocale();
  const [tab, setTab] = useState<Tab>("all");
  const [open, setOpen] = useState(false);
  const preferEn = !locale.startsWith("zh");

  const tabs = useMemo(
    () => TAB_KEYS.map((item) => ({ id: item.id, label: t(item.key) })),
    [t]
  );

  const models = useMemo(() => {
    const domestic = SHOWCASE_MODELS.filter(
      (m) => showcaseRegion(m) === "domestic"
    );
    if (tab === "all") return domestic;
    return domestic.filter((m) => m.kind === tab);
  }, [tab]);

  const tabLabel = tabs.find((item) => item.id === tab)?.label ?? t("landing.tabAll");

  return (
    <div
      className="relative w-full max-w-[min(100%,520px)]"
      data-landing-model-panel
    >
      <div className="overflow-hidden rounded-xl border border-white/12 bg-[#0c0e12]/92 shadow-[0_28px_90px_rgba(0,0,0,0.6)] backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3 border-b border-white/8 px-3.5 py-2.5">
          <div className="flex items-center gap-1.5" aria-hidden>
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-zinc-300 hover:bg-white/10"
              aria-expanded={open}
            >
              {tabLabel}
              <ChevronDown className="h-3.5 w-3.5 opacity-70" />
            </button>
            {open ? (
              <div className="absolute end-0 top-full z-20 mt-1 max-h-64 min-w-[7.5rem] overflow-y-auto rounded-lg border border-white/10 bg-[#12151c] py-1 shadow-xl">
                {tabs.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setTab(item.id);
                      setOpen(false);
                    }}
                    className={`block w-full px-3 py-1.5 text-start text-xs ${
                      tab === item.id
                        ? "bg-white/10 text-white"
                        : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="max-h-[min(52vh,420px)] overflow-y-auto px-3.5 py-3">
          <p className="mb-2.5 text-[11px] font-medium tracking-[0.14em] text-[#a78bfa]">
            {t("landing.modelsTitle")}
          </p>
          <ul className="space-y-2">
            {models.map((model) => (
              <ModelRow key={model.id} model={model} preferEn={preferEn} />
            ))}
          </ul>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-white/8 px-3.5 py-2 text-[11px] text-zinc-500">
          <span className="truncate">
            {tf("landing.modelCount", { n: models.length })}
            {tab === "all" ? "" : ` · ${tabLabel}`}
          </span>
          <span className="inline-flex shrink-0 items-center gap-2">
            <span>{t("landing.modelsFooter")}</span>
            <Maximize2 className="h-3 w-3 opacity-50" aria-hidden />
          </span>
        </div>
      </div>
    </div>
  );
}
