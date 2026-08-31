"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useLocale } from "@/hooks/useLocale";

const ZH_BRAND = "AI 智能体超市";

/** Remount chrome trees when locale changes so every page refreshes immediately. */
export function LocaleTree({ children }: { children: React.ReactNode }) {
  const { locale, t } = useLocale();
  const pathname = usePathname();

  useEffect(() => {
    const brand = t("brand.name").trim() || "AI Agent Mart";
    if (locale.startsWith("zh")) {
      // Leave Next metadata; only undo accidental English brand swaps.
      if ((document.title || "").includes("AI Agent Mart")) {
        document.title = (document.title || "").replaceAll("AI Agent Mart", brand);
      }
      return;
    }

    if (pathname === "/" || pathname === "") {
      document.title = brand;
      return;
    }
    if (pathname === "/products") {
      document.title = `${t("nav.services")} · ${brand}`;
      return;
    }
    if (pathname === "/account") {
      document.title = `${t("nav.account")} · ${brand}`;
      return;
    }
    if (pathname === "/opened") {
      document.title = `${t("account.subscriptions")} · ${brand}`;
      return;
    }

    const next = (document.title || "")
      .replaceAll(ZH_BRAND, brand)
      .replaceAll("服务目录", t("nav.services"));
    if (next.trim()) document.title = next;
  }, [locale, t, pathname]);

  return <div key={locale} className="contents">{children}</div>;
}
