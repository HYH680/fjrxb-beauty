"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/Header";
import { SubscriptionList } from "@/components/SubscriptionList";
import { useSubscriptions } from "@/hooks/useSubscriptions";
import { formatPrice } from "@/lib/format";
import {
  paymentMethodLabel,
  paymentStatusLabel,
} from "@/lib/payment";

type PaidOrder = {
  id: string;
  amount: number;
  paymentMethod: string;
  status: string;
  providerRef: string | null;
  items: { id: string; productId: string; name: string; price: number }[];
};

function SuccessBody() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order");
  const { subscriptions, loading: subsLoading } = useSubscriptions();
  const [order, setOrder] = useState<PaidOrder | null>(null);
  const [orderLoading, setOrderLoading] = useState(Boolean(orderId));

  useEffect(() => {
    if (!orderId) {
      setOrderLoading(false);
      return;
    }
    let cancelled = false;
    fetch(`/api/orders/${orderId}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setOrder(data.order ?? null);
      })
      .catch(() => {
        if (!cancelled) setOrder(null);
      })
      .finally(() => {
        if (!cancelled) setOrderLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  const enterItem = order?.items[0]
    ? { id: order.items[0].productId, name: order.items[0].name }
    : subscriptions[0]
      ? { id: subscriptions[0].productId, name: subscriptions[0].name }
      : null;

  return (
    <div className="mx-auto max-w-lg px-4 py-24">
      <h1 className="text-4xl font-semibold tracking-tight">已经开通</h1>
      <p className="mt-4 leading-7 text-zinc-400">
        测试开通已入账（没有向微信/支付宝扣款）。开通记录已写进账户，可以进工作台。
      </p>

      {orderLoading ? (
        <p className="mt-8 text-sm text-zinc-500">正在读取订单…</p>
      ) : order ? (
        <div className="mt-8 rounded-2xl border border-white/10 px-4 py-4 text-sm">
          <div className="flex justify-between gap-3">
            <span className="text-zinc-500">支付方式</span>
            <span>{paymentMethodLabel(order.paymentMethod)}</span>
          </div>
          <div className="mt-3 flex justify-between gap-3">
            <span className="text-zinc-500">收款状态</span>
            <span>{paymentStatusLabel(order.status)}</span>
          </div>
          <div className="mt-3 flex justify-between gap-3">
            <span className="text-zinc-500">金额 / 月</span>
            <span>{formatPrice(order.amount)}</span>
          </div>
          {order.providerRef && (
            <p className="mt-3 break-all text-xs text-zinc-500">
              流水号 {order.providerRef}
            </p>
          )}
          <div className="mt-4 space-y-2 border-t border-white/5 pt-4">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between gap-3">
                <span>{item.name}</span>
                <span className="text-zinc-400">{formatPrice(item.price)}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-8">
        {subsLoading ? (
          <p className="text-sm text-zinc-500">正在读取已开通服务…</p>
        ) : subscriptions.length > 0 ? (
          <SubscriptionList items={subscriptions} />
        ) : null}
      </div>
      {enterItem && (
        <Link
          href={`/use/${enterItem.id}`}
          className="mt-8 inline-flex rounded-lg bg-[#c4843c] px-5 py-2.5 text-sm text-[#1a1208] hover:bg-[#d4944c]"
        >
          进入 {enterItem.name}
        </Link>
      )}
      <div className="mt-8 flex gap-6 text-sm">
        <Link href="/account" className="text-[#f3d2a0] underline">
          查看账户
        </Link>
        <Link href="/home" className="text-zinc-500 hover:text-zinc-200">
          回工作台
        </Link>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <div className="min-h-screen bg-[#0b0d10] text-zinc-100">
      <Header />
      <Suspense
        fallback={
          <p className="px-4 py-24 text-center text-sm text-zinc-500">加载中…</p>
        }
      >
        <SuccessBody />
      </Suspense>
    </div>
  );
}
