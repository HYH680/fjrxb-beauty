"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Header } from "@/components/Header";
import { useSubscriptions } from "@/hooks/useSubscriptions";
import { subscriptionStatusLabel } from "@/components/SubscriptionList";
import { useLocale } from "@/hooks/useLocale";
import { localizedProductName } from "@/lib/i18n/localize-copy";

const ChatAssistant = dynamic(
  () =>
    import("@/components/ChatAssistant").then((mod) => ({
      default: mod.ChatAssistant,
    })),
  {
    loading: () => <GuideLoading />,
  }
);

function GuideLoading() {
  const { t } = useLocale();
  return (
    <div className="flex h-full items-center justify-center text-sm text-zinc-500">
      {t("home.guideLoading")}
    </div>
  );
}

/** 顶栏只展示摘要，避免占满全屏把导购挤没 */
function OpenRequestsBar() {
  const { t, tf, locale } = useLocale();
  const { subscriptions, loading } = useSubscriptions();
  if (loading || subscriptions.length === 0) return null;

  const preview = subscriptions.slice(0, 4);

  return (
    <section className="shrink-0 border-b border-white/5 px-3 py-2.5 sm:px-4">
      <div className="mx-auto flex max-w-5xl items-center gap-3">
        <p className="shrink-0 text-xs text-zinc-400">
          {tf("home.activeCount", { n: subscriptions.length })}
        </p>
        <div className="min-w-0 flex-1 overflow-x-auto">
          <div className="flex gap-2 whitespace-nowrap pb-0.5">
            {preview.map((item) => {
              const name = localizedProductName(
                { id: item.productId, name: item.name },
                locale
              );
              return (
              <Link
                key={item.id}
                href={`/use/${item.productId}`}
                className="inline-flex max-w-[10rem] shrink-0 items-center truncate rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] text-zinc-300 hover:border-white/20 hover:text-white"
                title={`${name} · ${subscriptionStatusLabel(item.status, t)}`}
              >
                {name}
              </Link>
              );
            })}
            {subscriptions.length > preview.length ? (
              <span className="self-center text-[11px] text-zinc-600">
                +{subscriptions.length - preview.length}
              </span>
            ) : null}
          </div>
        </div>
        <Link
          href="/opened"
          className="shrink-0 text-[11px] text-[#93c5fd] hover:underline"
        >
          {t("home.manage")}
        </Link>
      </div>
    </section>
  );
}

/**
 * 工作台 = 全页导购（已开通只占顶条，不抢对话区）
 */
export default function AppHomePage() {
  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-transparent text-zinc-100">
      <Header />
      <OpenRequestsBar />
      <main className="relative z-10 mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col px-3 sm:px-4">
        <div className="fx-chat-glass relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/10 sm:rounded-3xl">
          <ChatAssistant variant="page" fill />
        </div>
      </main>
    </div>
  );
}
