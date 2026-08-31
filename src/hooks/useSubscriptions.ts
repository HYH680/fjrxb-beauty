"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { SubscriptionItem } from "@/types";

let cache: SubscriptionItem[] | null = null;
let inflight: Promise<SubscriptionItem[]> | null = null;

function loadSubscriptions(): Promise<SubscriptionItem[]> {
  if (cache) return Promise.resolve(cache);
  if (inflight) return inflight;
  inflight = fetch("/api/subscriptions")
    .then((res) => res.json())
    .then((data) => {
      const next: SubscriptionItem[] = data.subscriptions ?? [];
      cache = next;
      inflight = null;
      return next;
    })
    .catch(() => {
      inflight = null;
      cache = [];
      return [] as SubscriptionItem[];
    });
  return inflight;
}

export function invalidateSubscriptions() {
  cache = null;
  inflight = null;
}

let seenUserId: string | null | undefined;

export function useSubscriptions() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [items, setItems] = useState<SubscriptionItem[] | null>(
    userId ? cache : []
  );

  useEffect(() => {
    if (seenUserId !== userId) {
      invalidateSubscriptions();
      seenUserId = userId;
    }
    if (!userId) {
      setItems([]);
      return;
    }
    setItems(cache);
    let cancelled = false;
    loadSubscriptions().then((next) => {
      if (!cancelled) setItems(next);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const subscriptions = user ? (items ?? []) : [];
  const loading = Boolean(user) && items === null;

  return {
    subscriptions,
    loading,
    hasProduct: (productId: string) =>
      subscriptions.some((item) => item.productId === productId),
    isActive: (productId: string) =>
      subscriptions.some(
        (item) =>
          item.productId === productId &&
          (item.status === "active" || item.status === "paid")
      ),
  };
}
