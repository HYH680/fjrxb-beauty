"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChatAssistant } from "@/components/ChatAssistant";
import { ChatRedirectFallback } from "@/components/ChatFallbacks";
import { useAuth } from "@/hooks/useAuth";
import { useCatalog } from "@/hooks/useCatalog";
import { useSubscriptions } from "@/hooks/useSubscriptions";

export function ChatPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading } = useAuth();
  const { isActive, loading: subsLoading } = useSubscriptions();
  const { getById } = useCatalog();
  const about = searchParams.get("about") ?? undefined;
  const tryProductId = searchParams.get("try") ?? undefined;
  const [seedQuery, setSeedQuery] = useState(
    () => searchParams.get("q") ?? undefined
  );
  const tryProduct = tryProductId ? getById(tryProductId) : undefined;
  const canEnter =
    Boolean(tryProductId) &&
    Boolean(user) &&
    (Boolean(user?.isDeveloper) || Boolean(tryProductId && isActive(tryProductId)));

  useEffect(() => {
    if (!tryProductId || loading || subsLoading) return;
    if (!user) {
      router.replace(
        `/login?callbackUrl=${encodeURIComponent(`/tools/${tryProductId}`)}`
      );
      return;
    }
    if (canEnter) {
      router.replace(`/use/${tryProductId}`);
      return;
    }
    router.replace(`/tools/${tryProductId}`);
  }, [tryProductId, loading, subsLoading, user, canEnter, router]);

  if (tryProduct) {
    return <ChatRedirectFallback />;
  }

  return (
    <main className="relative z-10 mx-auto flex min-h-0 w-full max-w-[1400px] flex-1 flex-col px-2 sm:px-3">
      <ChatAssistant
        variant="page"
        fill
        wechatStyle
        contextProductId={about}
        injectText={seedQuery}
        onInjectConsumed={() => setSeedQuery(undefined)}
      />
    </main>
  );
}
