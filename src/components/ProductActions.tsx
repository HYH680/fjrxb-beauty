"use client";

import Link from "next/link";
import type { Product } from "@/types";
import { AddToCartButton } from "@/components/AddToCartButton";
import { useAuth } from "@/hooks/useAuth";
import { useSubscriptions } from "@/hooks/useSubscriptions";
import { useLocale } from "@/hooks/useLocale";

export function ProductActions({
  product,
  live,
}: {
  product: Product;
  live: boolean;
}) {
  const { user } = useAuth();
  const { isActive, loading } = useSubscriptions();
  const { t } = useLocale();

  if (!loading && isActive(product.id)) {
    return (
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <Link
          href={`/use/${product.id}`}
          className="ui-press rounded-lg bg-[#7c5cff] px-5 py-3 text-sm font-medium text-white hover:bg-[#8b6dff]"
        >
          {t("action.enterService")}
        </Link>
        <Link
          href={`/chat?about=${product.id}`}
          className="text-sm text-[#a78bfa] underline transition-opacity duration-200 hover:opacity-80"
        >
          {t("action.askFollowUp")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-6 flex flex-wrap items-center gap-4">
      <AddToCartButton product={product} size="lg" />
      {live && user?.isDeveloper && (
        <Link
          href={`/use/${product.id}`}
          className="text-sm text-[#a78bfa] underline transition-opacity duration-200 hover:opacity-80"
        >
          {t("action.enterService")}
        </Link>
      )}
      <Link
        href={`/chat?about=${product.id}`}
        className="text-sm text-[#a78bfa] underline transition-opacity duration-200 hover:opacity-80"
      >
        {t("action.askFit")}
      </Link>
    </div>
  );
}
