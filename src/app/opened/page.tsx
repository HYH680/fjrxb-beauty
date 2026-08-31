"use client";

import Link from "next/link";
import { Header } from "@/components/Header";
import { SubscriptionList } from "@/components/SubscriptionList";
import { useAuth } from "@/hooks/useAuth";
import { useLocale } from "@/hooks/useLocale";
import { useSubscriptions } from "@/hooks/useSubscriptions";

function isOpenedStatus(status: string) {
  return status === "active" || status === "paid";
}

/** 已开通服务专属页：展示本账户开通服务卡；无开通则空态提示 */
export default function OpenedServicesPage() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useLocale();
  const { subscriptions, loading: subsLoading } = useSubscriptions();

  if (authLoading) {
    return <div className="p-24 text-center text-zinc-500">{t("common.loading")}</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0f0d0b] text-zinc-100">
        <Header />
        <div className="px-4 py-24 text-center">
          <p className="mb-3 text-zinc-400">{t("account.needLogin")}</p>
          <Link href="/login?callbackUrl=/opened" className="text-[#f3d2a0] underline">
            {t("account.goLogin")}
          </Link>
        </div>
      </div>
    );
  }

  const opened = subscriptions.filter((item) => isOpenedStatus(item.status));

  return (
    <div className="min-h-screen bg-[#0f0d0b] text-zinc-100">
      <Header />
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <h1 className="text-4xl font-semibold tracking-tight text-[#faf6f0]">
          {t("account.subscriptions")}
        </h1>

        {subsLoading ? (
          <p className="mt-10 text-sm text-zinc-500">{t("common.loading")}</p>
        ) : opened.length === 0 ? (
          <div className="mt-10 max-w-lg">
            <p className="text-base leading-7 text-zinc-300">{t("nav.openedEmpty")}</p>
            <Link
              href="/products"
              className="ui-press mt-6 inline-flex rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-zinc-200 transition-colors hover:border-white/30 hover:bg-white/10"
            >
              {t("nav.browseServices")}
            </Link>
          </div>
        ) : (
          <div className="mt-10 ui-fade-in">
            <SubscriptionList items={opened} />
          </div>
        )}
      </div>
    </div>
  );
}
