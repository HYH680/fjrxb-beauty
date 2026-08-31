"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useLocale } from "@/hooks/useLocale";

/** 顶栏「已开通」：进入专属页展示本账户已开通服务 */
export function OpenedServicesMenu() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useLocale();

  if (authLoading) return null;

  return (
    <Link
      href={user ? "/opened" : "/login?callbackUrl=/opened"}
      className="ui-press ms-0.5 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-zinc-200 transition-colors hover:border-white/30 hover:bg-white/10 hover:text-white"
    >
      {t("nav.opened")}
    </Link>
  );
}
