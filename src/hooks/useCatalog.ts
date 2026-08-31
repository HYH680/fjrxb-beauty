"use client";

import { useCallback, useEffect, useState } from "react";
import type { Product } from "@/types";
import { products as seedProducts } from "@/data/products";

let cache: Product[] | null = null;
let inflight: Promise<Product[]> | null = null;

function loadCatalog(): Promise<Product[]> {
  if (cache) return Promise.resolve(cache);
  if (inflight) return inflight;
  inflight = fetch("/api/catalog")
    .then((res) => res.json())
    .then((data) => {
      const next: Product[] = Array.isArray(data.products)
        ? data.products
        : seedProducts;
      cache = next;
      inflight = null;
      return next;
    })
    .catch(() => {
      inflight = null;
      cache = seedProducts;
      return seedProducts;
    });
  return inflight;
}

export function invalidateCatalog() {
  cache = null;
  inflight = null;
}

export function useCatalog() {
  const [items, setItems] = useState<Product[]>(cache ?? seedProducts);
  const [ready, setReady] = useState(Boolean(cache));

  useEffect(() => {
    let cancelled = false;
    loadCatalog().then((next) => {
      if (!cancelled) {
        setItems(next);
        setReady(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const getById = useCallback(
    (id: string) => items.find((product) => product.id === id),
    [items]
  );

  return {
    products: items,
    ready,
    getById,
  };
}
