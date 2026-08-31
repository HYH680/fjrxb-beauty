"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CreditCard } from "lucide-react";
import { Header } from "@/components/Header";
import { useCartStore } from "@/store/cart";
import { useAuth } from "@/hooks/useAuth";
import { useLocale } from "@/hooks/useLocale";
import { formatPrice } from "@/lib/format";
import { localizedDisplayName, localizedProductName } from "@/lib/i18n/localize-copy";
import { invalidateSubscriptions } from "@/hooks/useSubscriptions";
import {
  PAYMENT_METHODS,
  type PaymentMethodId,
} from "@/lib/payment";

function PaymentMark({ id }: { id: PaymentMethodId }) {
  if (id === "sandbox") {
    return (
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-700 text-[11px] font-bold text-zinc-100">
        测
      </span>
    );
  }
  if (id === "wechat") {
    return (
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#07c160] text-sm font-bold text-white">
        微
      </span>
    );
  }
  if (id === "alipay") {
    return (
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1677ff] text-sm font-bold text-white">
        支
      </span>
    );
  }
  if (id === "paypal") {
    return (
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#003087] text-[11px] font-bold text-white">
        P
      </span>
    );
  }
  return (
    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-700 text-zinc-100">
      <CreditCard className="h-4 w-4" />
    </span>
  );
}

export default function CheckoutPage() {
  const router = useRouter();
  const { t, locale } = useLocale();
  const { user, loading: authLoading } = useAuth();
  const { items, totalPrice, clearCart } = useCartStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodId | "">("sandbox");
  const accountLine = authLoading
    ? t("common.loading")
    : `${localizedDisplayName(user?.name, locale) || user?.name || ""} · ${user?.email ?? ""}`;

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-[#0b0d10] text-zinc-100">
        <Header />
        <div className="mx-auto max-w-lg px-4 py-24 text-center">
          <p className="text-zinc-500">待开通是空的</p>
          <Link href="/products" className="mt-4 inline-block text-[#f3d2a0] underline">
            返回货架
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0d10] text-zinc-100">
      <Header />
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <Link href="/cart" className="text-sm text-zinc-500 hover:text-zinc-200">
          ← 待开通
        </Link>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight">确认开通</h1>
        <p className="mt-2 text-sm text-zinc-500">
          没有真微信支付 / 支付宝。本机和开发者邮箱走测试开通：确认后立刻入账，不会向微信或支付宝扣款。普通人在生产环境开不了真收款。
        </p>

        <div className="mt-10 grid gap-12 lg:grid-cols-5">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!paymentMethod) {
                setError("请选择支付方式");
                return;
              }
              setLoading(true);
              setError("");
              try {
                const res = await fetch("/api/checkout", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    paymentMethod,
                    productIds: items.map((item) => item.product.id),
                  }),
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) {
                  setError(data.error || "支付提交失败，请稍后重试");
                  return;
                }
                clearCart();
                invalidateSubscriptions();
                const orderId =
                  typeof data.orderId === "string" ? data.orderId : "";
                router.push(
                  orderId
                    ? `/checkout/success?order=${encodeURIComponent(orderId)}`
                    : "/checkout/success"
                );
              } catch {
                setError("网络错误，请稍后重试");
              } finally {
                setLoading(false);
              }
            }}
            className="space-y-5 lg:col-span-3"
          >
            <div>
              <p className="mb-1.5 text-sm text-zinc-500">付款账户</p>
              <p className="rounded-lg border border-white/10 bg-[#12151c] px-4 py-2.5 text-sm">
                {authLoading ? t("common.loading") : accountLine}
              </p>
            </div>
            <fieldset>
              <legend className="mb-3 text-sm text-zinc-500">支付方式</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {PAYMENT_METHODS.map((method) => {
                  const selected = paymentMethod === method.id;
                  return (
                    <label
                      key={method.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 transition-colors ${
                        selected
                          ? "border-[#c4843c] bg-[#c4843c]/10"
                          : "border-white/10 bg-[#16120e] hover:border-[#c4843c]/30"
                      }`}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={method.id}
                        checked={selected}
                        onChange={() => {
                          setPaymentMethod(method.id);
                          setError("");
                        }}
                        className="sr-only"
                      />
                      <PaymentMark id={method.id} />
                      <span className="text-sm">{method.label}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={loading || authLoading || !user || !paymentMethod}
              className="w-full rounded-lg bg-[#c4843c] py-3 font-medium text-[#1a1208] hover:bg-[#d4944c] disabled:opacity-50"
            >
              {loading ? "提交中…" : `确认开通 ${formatPrice(totalPrice())}`}
            </button>
          </form>

          <div className="lg:col-span-2">
            <p className="text-sm text-zinc-500">本单将开通</p>
            <div className="mt-4 space-y-3 text-sm">
              {items.map(({ product }) => (
                <div key={product.id} className="flex justify-between gap-3">
                  <span>{localizedProductName(product, locale)}</span>
                  <span>{formatPrice(product.price)}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-between border-t border-white/5 pt-4 text-sm">
              <span className="text-zinc-500">合计 / 月</span>
              <span>{formatPrice(totalPrice())}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
