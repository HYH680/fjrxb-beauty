"use client";

import Link from "next/link";
import { Trash2 } from "lucide-react";
import { Header } from "@/components/Header";
import { SiteFooter } from "@/components/SiteFooter";
import { useCartStore } from "@/store/cart";
import { useAuth } from "@/hooks/useAuth";
import { useLocale } from "@/hooks/useLocale";
import { formatPrice } from "@/lib/format";
import { SCENE_LABEL_KEYS, SCENE_TONE, sceneForProduct } from "@/lib/product-meta";
import { localizedProductName } from "@/lib/i18n/localize-copy";

export default function CartPage() {
  const { user } = useAuth();
  const { t, locale } = useLocale();
  const { items, removeItem, totalPrice, clearCart } = useCartStore();

  return (
    <div className="min-h-screen bg-[#0f0d0b] text-zinc-100">
      <Header />
      <div className="mx-auto flex min-h-[70vh] max-w-5xl flex-col px-4 py-10 sm:px-6">
        <p className="text-xs tracking-widest text-[#e08a3c]">{t("cart.eyebrow")}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#faf6f0]">
          {t("cart.title")}
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          {user ? t("cart.leadAuthed") : t("cart.leadGuest")}
        </p>

        {items.length === 0 ? (
          <div className="mt-14 rounded-xl border border-[#c4843c]/20 bg-[#16120e] px-5 py-10">
            <p className="text-zinc-400">{t("cart.empty")}</p>
            <div className="mt-4 flex flex-wrap gap-4 text-sm">
              <Link href="/products" className="text-[#f3d2a0] underline">
                {t("cart.goShelf")}
              </Link>
              <Link href="/chat" className="text-zinc-500 hover:text-zinc-200">
                {t("cart.askWhich")}
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-6 divide-y divide-[#c4843c]/10 rounded-xl border border-[#c4843c]/20 bg-[#16120e] px-4">
              {items.map(({ product }) => {
                const scene = sceneForProduct(product);
                return (
                  <div key={product.id} className="flex items-center gap-4 py-5">
                    <span
                      className={`h-10 w-1.5 shrink-0 rounded-full ${SCENE_TONE[scene].rail}`}
                    />
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/tools/${product.id}`}
                        className="font-medium hover:text-[#f3d2a0]"
                      >
                        {localizedProductName(product, locale)}
                      </Link>
                      <p className="mt-1 text-xs text-zinc-500">
                        {t(SCENE_LABEL_KEYS[scene])} · {formatPrice(product.price)} /{" "}
                        {product.unit === "每月" ? t("common.perMonth") : product.unit}
                      </p>
                    </div>
                    <p className="w-20 text-right">{formatPrice(product.price)}</p>
                    <button
                      type="button"
                      onClick={() => removeItem(product.id)}
                      className="p-2 text-zinc-500 hover:text-zinc-200"
                      aria-label={`${t("cart.remove")} ${localizedProductName(product, locale)}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={clearCart}
                className="text-sm text-zinc-500 hover:text-zinc-300"
              >
                {t("common.clear")}
              </button>
              <Link href="/chat" className="text-sm text-[#f3d2a0] hover:underline">
                {t("cart.stillUnsure")}
              </Link>
            </div>
            <div className="mt-auto border-t border-[#c4843c]/20 pt-6">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">{t("cart.totalMonth")}</span>
                <span className="text-2xl text-[#faf6f0]">{formatPrice(totalPrice())}</span>
              </div>
              <p className="mt-2 text-xs text-zinc-500">{t("cart.payNote")}</p>
              <Link
                href={user ? "/checkout" : `/login?callbackUrl=${encodeURIComponent("/checkout")}`}
                className="mt-6 flex w-full items-center justify-center rounded-lg bg-[#c4843c] py-3 font-medium text-[#1a1208] hover:bg-[#d4944c]"
              >
                {user ? t("cart.confirm") : t("cart.loginToOpen")}
              </Link>
            </div>
          </>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}
