"use client";

import Link from "next/link";
import type { SubscriptionItem } from "@/types";
import { formatPrice } from "@/lib/format";
import { useLocale } from "@/hooks/useLocale";
import type { MessageKey } from "@/lib/i18n/messages";
import {
  localizedProductName,
  preferEnglishCopy,
} from "@/lib/i18n/localize-copy";
import { productCopyEn } from "@/lib/i18n/product-en";

export function subscriptionStatusLabel(
  status: string,
  t: (key: MessageKey) => string
) {
  if (status === "active") return t("sub.statusActive");
  if (status === "paid") return t("sub.statusPaid");
  return t("sub.statusPending");
}

function paymentLabel(id: string | null | undefined, t: (key: MessageKey) => string) {
  if (!id) return t("pay.none");
  const map: Record<string, MessageKey> = {
    sandbox: "pay.sandbox",
    wechat: "pay.wechat",
    alipay: "pay.alipay",
    paypal: "pay.paypal",
    card: "pay.card",
    stripe: "pay.stripe",
    developer: "pay.developer",
  };
  const key = map[id];
  return key ? t(key) : id;
}

function canEnter(status: string) {
  return status === "active" || status === "paid";
}

export function SubscriptionList({
  items,
  columns = 3,
}: {
  items: SubscriptionItem[];
  columns?: 2 | 3;
}) {
  const { t, locale } = useLocale();
  const grid =
    columns === 2
      ? "grid gap-3 sm:grid-cols-2"
      : "grid gap-3 sm:grid-cols-2 lg:grid-cols-3";

  return (
    <ul className={grid}>
      {items.map((item) => {
        const name =
          preferEnglishCopy(locale) && productCopyEn(item.productId)?.name
            ? productCopyEn(item.productId)!.name
            : localizedProductName(
                { id: item.productId, name: item.name },
                locale
              );
        return (
        <li
          key={item.id}
          className="flex flex-col justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3.5 text-sm"
        >
          <div className="min-w-0">
            <p className="line-clamp-2 font-medium leading-snug text-zinc-100">
              {name}
            </p>
            <p className="mt-1.5 text-xs leading-5 text-zinc-500">
              {subscriptionStatusLabel(item.status, t)}
              {item.paymentMethod
                ? ` · ${paymentLabel(item.paymentMethod, t)}`
                : ""}
              {" · "}
              {formatPrice(item.price)} /{" "}
              {item.unit === "每月" ? t("common.perMonth") : item.unit}
            </p>
          </div>
          {canEnter(item.status) ? (
            <Link
              href={`/use/${item.productId}`}
              className="inline-flex w-fit shrink-0 rounded-lg bg-[#3b82f6] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#2563eb]"
            >
              {t("action.enterService")}
            </Link>
          ) : (
            <Link
              href={`/tools/${item.productId}`}
              className="w-fit shrink-0 text-xs text-[#93c5fd] hover:underline"
            >
              {t("account.view")}
            </Link>
          )}
        </li>
        );
      })}
    </ul>
  );
}
