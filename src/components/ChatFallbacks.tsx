"use client";

import { useLocale } from "@/hooks/useLocale";

export function ChatOpeningFallback() {
  const { t } = useLocale();
  return (
    <div className="flex flex-1 items-center justify-center text-sm text-zinc-500">
      {t("chat.opening")}
    </div>
  );
}

export function ChatRedirectFallback() {
  const { t } = useLocale();
  return (
    <div className="flex flex-1 items-center justify-center text-sm text-zinc-500">
      {t("chat.redirecting")}
    </div>
  );
}
