"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  WORLD_LOCALES,
  getLocaleInfo,
  isRtlLocale,
  type LocaleInfo,
} from "@/lib/i18n/locales";
import { tf as formatMessage, translate, type MessageKey } from "@/lib/i18n/messages";

type LocaleContextValue = {
  locale: string;
  localeInfo: LocaleInfo;
  setLocale: (code: string) => void;
  t: (key: MessageKey) => string;
  tf: (key: MessageKey, vars: Record<string, string | number>) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

let memoryLocale = DEFAULT_LOCALE;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function readStoredLocale(): string {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  try {
    const raw = window.localStorage.getItem(LOCALE_STORAGE_KEY)?.trim();
    if (raw && WORLD_LOCALES.some((l) => l.code === raw)) return raw;
  } catch {
    /* ignore */
  }
  return DEFAULT_LOCALE;
}

function applyDocumentLocale(code: string) {
  if (typeof document === "undefined") return;
  const safe = code.trim() || DEFAULT_LOCALE;
  document.documentElement.lang = safe;
  document.documentElement.dir = isRtlLocale(safe) ? "rtl" : "ltr";
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getClientSnapshot() {
  return memoryLocale;
}

function getServerSnapshot() {
  return DEFAULT_LOCALE;
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const locale = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);

  // Sync from localStorage only after mount so SSR HTML matches first client paint.
  useEffect(() => {
    const next = readStoredLocale();
    if (next !== memoryLocale) {
      memoryLocale = next;
      applyDocumentLocale(next);
      emit();
    } else {
      applyDocumentLocale(memoryLocale);
    }
  }, []);

  const setLocale = useCallback((code: string) => {
    const safe = code.trim();
    const info = WORLD_LOCALES.find((l) => l.code === safe);
    if (!info) return;
    memoryLocale = safe;
    applyDocumentLocale(safe);
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, safe);
    } catch {
      /* ignore */
    }
    emit();
  }, []);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      localeInfo: getLocaleInfo(locale),
      setLocale,
      t: (key) => translate(locale, key),
      tf: (key, vars) => formatMessage(locale, key, vars),
    }),
    [locale, setLocale]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale must be used within LocaleProvider");
  }
  return ctx;
}
