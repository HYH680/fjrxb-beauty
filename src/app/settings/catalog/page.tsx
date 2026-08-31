"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { AUTH_BTN, AUTH_INPUT } from "@/components/AuthLayout";
import { useAuth } from "@/hooks/useAuth";
import { invalidateCatalog } from "@/hooks/useCatalog";
import type { Product } from "@/types";
import { formatPrice } from "@/lib/format";

export default function CatalogSettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const forbidden = Boolean(!authLoading && user && !user.isAdmin);

  useEffect(() => {
    if (authLoading || !user?.isAdmin) return;
    fetch("/api/catalog/admin")
      .then((res) => res.json())
      .then((data) => {
        setProducts(Array.isArray(data.products) ? data.products : []);
      })
      .catch(() => setError("无法读取目录"))
      .finally(() => setLoading(false));
  }, [authLoading, user]);

  const save = async (product: Product) => {
    setSavingId(product.id);
    setError("");
    setMessage("");
    try {
      const res = await fetch(`/api/catalog/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: product.name,
          description: product.description,
          price: product.price,
          unit: product.unit,
          badge: product.badge || null,
          pricingNote: product.pricingNote,
          published: product.published !== false,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "保存失败");
        return;
      }
      invalidateCatalog();
      setMessage(`${product.name} 已保存`);
    } catch {
      setError("保存失败");
    } finally {
      setSavingId("");
    }
  };

  const update = (id: string, patch: Partial<Product>) => {
    setProducts((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  };

  return (
    <div className="min-h-screen bg-[#0b0d10] text-zinc-100">
      <Header />
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <Link href="/settings" className="text-sm text-zinc-500 hover:text-zinc-200">
          ← 平台设置
        </Link>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight">目录与价格</h1>
        <p className="mt-2 text-sm text-zinc-500">
          改这里会写进数据库。没有编造评分和用量，封面是分类示意，不是实拍图。
        </p>

        {forbidden ? (
          <p className="mt-10 text-sm text-zinc-500">只有管理员可以改目录。</p>
        ) : loading ? (
          <p className="mt-10 text-sm text-zinc-500">加载中…</p>
        ) : (
          <div className="mt-8 space-y-6">
            {error && <p className="text-sm text-red-400">{error}</p>}
            {message && <p className="text-sm text-emerald-400">{message}</p>}
            {products.map((product) => (
              <div
                key={product.id}
                className="space-y-3 rounded-2xl border border-white/10 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-zinc-500">{product.id}</p>
                  <label className="flex items-center gap-2 text-sm text-zinc-400">
                    <input
                      type="checkbox"
                      checked={product.published !== false}
                      onChange={(e) =>
                        update(product.id, { published: e.target.checked })
                      }
                    />
                    上架
                  </label>
                </div>
                <input
                  value={product.name}
                  onChange={(e) => update(product.id, { name: e.target.value })}
                  className={AUTH_INPUT}
                />
                <textarea
                  value={product.description}
                  onChange={(e) =>
                    update(product.id, { description: e.target.value })
                  }
                  className={`${AUTH_INPUT} min-h-20`}
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    value={product.price}
                    onChange={(e) =>
                      update(product.id, { price: Number(e.target.value) })
                    }
                    className={AUTH_INPUT}
                  />
                  <input
                    value={product.unit}
                    onChange={(e) => update(product.id, { unit: e.target.value })}
                    className={AUTH_INPUT}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => save(product)}
                  disabled={savingId === product.id}
                  className={`${AUTH_BTN} w-auto px-4`}
                >
                  {savingId === product.id
                    ? "保存中…"
                    : `保存 ${formatPrice(product.price)}`}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
