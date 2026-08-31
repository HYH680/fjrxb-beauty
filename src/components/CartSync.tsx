"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useCartStore } from "@/store/cart";
import { useCatalog } from "@/hooks/useCatalog";
import type { Product } from "@/types";

function productsFromCartPayload(
  payload: { items?: { product?: Product }[]; productIds?: string[] },
  getById: (id: string) => Product | undefined
): Product[] {
  if (Array.isArray(payload.items) && payload.items.length > 0) {
    return payload.items
      .map((item) => item.product)
      .filter((product): product is Product => Boolean(product?.id));
  }
  const ids = Array.isArray(payload.productIds) ? payload.productIds : [];
  return ids
    .map((id) => getById(id))
    .filter((product): product is Product => Boolean(product));
}

export function CartSync() {
  const { user, loading } = useAuth();
  const { products, ready: catalogReady, getById } = useCatalog();
  const getByIdRef = useRef(getById);
  getByIdRef.current = getById;
  const items = useCartStore((s) => s.items);
  const replaceItems = useCartStore((s) => s.replaceItems);
  const [persistReady, setPersistReady] = useState(false);
  const hydrating = useRef(false);
  const ready = useRef(false);
  const hadUser = useRef(false);

  useEffect(() => {
    const persistApi = useCartStore.persist;
    if (!persistApi) {
      setPersistReady(true);
      return;
    }
    const unsub = persistApi.onFinishHydration(() => {
      setPersistReady(true);
    });
    void persistApi.rehydrate();
    if (persistApi.hasHydrated()) {
      setPersistReady(true);
    }
    return unsub;
  }, []);

  useEffect(() => {
    if (loading || !persistReady) return;

    if (!user) {
      if (hadUser.current) {
        replaceItems([]);
      }
      hadUser.current = false;
      ready.current = false;
      hydrating.current = false;
      return;
    }

    hadUser.current = true;
    hydrating.current = true;
    let cancelled = false;

    (async () => {
      const localIds = useCartStore
        .getState()
        .items.map((item) => item.product.id);
      const res = await fetch("/api/cart");
      if (!res.ok) {
        if (!cancelled) {
          hydrating.current = false;
          ready.current = false;
        }
        return;
      }
      const data = await res.json().catch(() => ({ productIds: [] }));
      const serverIds: string[] = Array.isArray(data.productIds)
        ? data.productIds
        : [];
      const merged = [...new Set([...serverIds, ...localIds])];
      const put = await fetch("/api/cart", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds: merged }),
      });
      const saved = await put.json().catch(() => ({ productIds: merged }));
      if (cancelled) return;
      replaceItems(productsFromCartPayload(saved, getByIdRef.current));
      hydrating.current = false;
      ready.current = true;
    })();

    return () => {
      cancelled = true;
    };
  }, [user, loading, persistReady, replaceItems]);

  useEffect(() => {
    if (!persistReady || !catalogReady || hydrating.current) return;
    const current = useCartStore.getState().items;
    if (current.length === 0) return;
    const byId = new Map(products.map((product) => [product.id, product]));
    let changed = false;
    const next = current
      .map((item) => {
        const live = byId.get(item.product.id);
        if (!live) {
          changed = true;
          return null;
        }
        if (
          live.price !== item.product.price ||
          live.name !== item.product.name ||
          live.image !== item.product.image
        ) {
          changed = true;
        }
        return live;
      })
      .filter((product): product is Product => Boolean(product));
    if (changed) replaceItems(next);
  }, [products, persistReady, catalogReady, replaceItems]);

  useEffect(() => {
    if (!persistReady || !user || hydrating.current || !ready.current) return;
    fetch("/api/cart", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productIds: items.map((item) => item.product.id),
      }),
    });
  }, [items, user, persistReady]);

  return null;
}
