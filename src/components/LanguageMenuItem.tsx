"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronRight, Languages } from "lucide-react";
import { WORLD_LOCALES } from "@/lib/i18n/locales";
import { useLocale } from "@/hooks/useLocale";
import LineSidebar from "@/components/react-bits/LineSidebar";

type Props = {
  /** icon: header globe; menu-row: dropdown row; pill: PillNav language pill */
  variant?: "menu-row" | "icon" | "pill";
  onPicked?: () => void;
  /** Used by pill variant for hover animation hooks */
  onPillEnter?: () => void;
  onPillLeave?: () => void;
  circleRef?: (el: HTMLSpanElement | null) => void;
};

export function LanguageMenuItem({
  variant = "menu-row",
  onPicked,
  onPillEnter,
  onPillLeave,
  circleRef,
}: Props) {
  const { locale, setLocale, t } = useLocale();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const localeLabels = useMemo(
    () => WORLD_LOCALES.map((l) => l.native),
    []
  );

  const selectedLocaleIndex = useMemo(() => {
    const idx = WORLD_LOCALES.findIndex((l) => l.code === locale);
    return idx >= 0 ? idx : 0;
  }, [locale]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return WORLD_LOCALES;
    return WORLD_LOCALES.filter(
      (l) =>
        l.code.toLowerCase().includes(q) ||
        l.native.toLowerCase().includes(q) ||
        l.en.toLowerCase().includes(q)
    );
  }, [query]);

  useEffect(() => {
    if (!open) return;

    function onDoc(e: MouseEvent) {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current =
    WORLD_LOCALES.find((l) => l.code === locale) ||
    WORLD_LOCALES.find((l) => l.code === "zh-CN");
  const currentNative = current?.native?.trim() || locale || "zh-CN";

  const listPanel = (
    <>
      <div className="border-b border-white/8 p-2">
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("nav.searchLanguage")}
          className="w-full rounded-md border border-white/10 bg-black/40 px-2.5 py-1.5 text-xs text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-[#c4843c]/40"
        />
      </div>
      <ul className="max-h-[min(58vh,340px)] overflow-y-auto py-1">
        {filtered.map((item) => {
          const active = item.code === locale;
          return (
            <li key={item.code}>
              <button
                type="button"
                onClick={() => {
                  setLocale(item.code);
                  setOpen(false);
                  onPicked?.();
                }}
                className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-start text-sm hover:bg-white/5 ${
                  active ? "bg-white/8 text-white" : "text-zinc-300"
                }`}
              >
                <span className="min-w-0">
                  <span className="block truncate">{item.native}</span>
                  <span className="block truncate text-[11px] text-zinc-500">
                    {item.en}
                  </span>
                </span>
                {active ? (
                  <Check className="h-3.5 w-3.5 shrink-0 text-[#e08a3c]" />
                ) : null}
              </button>
            </li>
          );
        })}
        {filtered.length === 0 ? (
          <li className="px-3 py-4 text-center text-xs text-zinc-500">—</li>
        ) : null}
      </ul>
    </>
  );

  if (variant === "pill") {
    const sidebarPanel =
      open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={panelRef}
              className="line-sidebar-lang"
              role="dialog"
              aria-label={t("nav.language")}
            >
              <button
                type="button"
                className="line-sidebar-lang__close"
                aria-label="Close"
                onClick={() => setOpen(false)}
              >
                ×
              </button>
              <LineSidebar
                key={locale}
                items={localeLabels}
                defaultActive={selectedLocaleIndex}
                accentColor="#e0b07a"
                textColor="#a1a1aa"
                markerColor="#52525b"
                showIndex
                showMarker
                proximityRadius={88}
                maxShift={24}
                falloff="smooth"
                markerLength={36}
                markerGap={10}
                tickScale={0.42}
                scaleTick
                itemGap={12}
                fontSize={0.92}
                smoothing={90}
                infiniteScroll
                onItemClick={(_index, label) => {
                  const match = WORLD_LOCALES.find((l) => l.native === label);
                  if (!match) return;
                  setLocale(match.code);
                  onPicked?.();
                  setOpen(false);
                }}
              />
            </div>,
            document.body
          )
        : null;

    return (
      <div className="relative flex h-full" ref={rootRef}>
        <button
          type="button"
          role="menuitem"
          className="pill"
          onClick={() => setOpen((v) => !v)}
          onMouseEnter={onPillEnter}
          onMouseLeave={onPillLeave}
          aria-label={t("nav.language")}
          aria-expanded={open}
          title={currentNative}
        >
          <span className="hover-circle" aria-hidden="true" ref={circleRef} />
          <span className="label-stack">
            <span className="pill-label">{t("nav.language")}</span>
            <span className="pill-label-hover" aria-hidden="true">
              {t("nav.language")}
            </span>
          </span>
        </button>
        {sidebarPanel}
      </div>
    );
  }

  const panel = open ? (
    <div
      ref={panelRef}
      className={`absolute z-[60] w-64 overflow-hidden rounded-xl border border-white/10 bg-[#12151c] shadow-2xl ${
        variant === "menu-row"
          ? "end-full top-0 me-1 max-h-[min(70vh,420px)]"
          : "end-0 top-full mt-2 max-h-[min(70vh,420px)]"
      }`}
    >
      {listPanel}
    </div>
  ) : null;

  if (variant === "icon") {
    return (
      <div className="relative" ref={rootRef}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-zinc-300 hover:text-white sm:px-3"
          aria-label={t("nav.language")}
          aria-expanded={open}
          title={currentNative}
        >
          <Languages className="h-4 w-4 shrink-0" />
          <span className="hidden max-w-[6.5rem] truncate text-xs sm:inline">
            {currentNative}
          </span>
        </button>
        {panel}
      </div>
    );
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-4 py-2 text-start text-sm text-zinc-300 hover:bg-white/5"
      >
        <span className="inline-flex items-center gap-2">
          <Languages className="h-3.5 w-3.5 text-zinc-500" />
          {t("nav.language")}
        </span>
        <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
          {currentNative}
          <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" />
        </span>
      </button>
      {panel}
    </div>
  );
}
