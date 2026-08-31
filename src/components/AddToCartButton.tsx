"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import type { Product } from "@/types";
import { useCartStore } from "@/store/cart";
import { useSubscriptions } from "@/hooks/useSubscriptions";
import { useLocale } from "@/hooks/useLocale";
import { localizedProductName } from "@/lib/i18n/localize-copy";

interface AddToCartButtonProps {
  product: Product;
  size?: "sm" | "md" | "lg";
}

export function AddToCartButton({ product, size = "md" }: AddToCartButtonProps) {
  const { t, locale } = useLocale();
  const addItem = useCartStore((s) => s.addItem);
  const inCart = useCartStore((s) =>
    s.items.some((item) => item.product.id === product.id)
  );
  const { hasProduct, isActive, loading } = useSubscriptions();
  const alreadyRequested = hasProduct(product.id);
  const alreadyActive = isActive(product.id);
  const [added, setAdded] = useState(false);
  const displayName = localizedProductName(product, locale);

  const sizeClasses = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-5 py-3 text-sm",
  };

  if (!loading && alreadyActive) {
    return (
      <Link
        href={`/use/${product.id}`}
        className={`ui-press ${sizeClasses[size]} rounded-lg bg-[#7c5cff] font-medium text-white hover:bg-[#8b6dff]`}
        onClick={(e) => e.stopPropagation()}
      >
        {t("action.enterService")}
      </Link>
    );
  }

  if (!loading && alreadyRequested) {
    return (
      <Link
        href="/account"
        className={`ui-press ${sizeClasses[size]} rounded-lg bg-[#7c5cff]/15 font-medium text-[#c4b5fd]`}
        onClick={(e) => e.stopPropagation()}
      >
        {t("action.applied")}
      </Link>
    );
  }

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const shown = added || inCart;

  return (
    <button
      type="button"
      onClick={handleAdd}
      aria-label={
        shown
          ? `${displayName} · ${t("action.added")}`
          : `${t("action.addCart")} · ${displayName}`
      }
      className={`ui-press ${sizeClasses[size]} rounded-lg font-medium ${
        shown
          ? "bg-[#7c5cff]/15 text-[#c4b5fd]"
          : "bg-[#7c5cff] text-white hover:bg-[#8b6dff]"
      }`}
    >
      {shown ? (
        <span className="inline-flex items-center gap-1 ui-fade-in">
          <Check className="h-3.5 w-3.5" />
          {t("action.added")}
        </span>
      ) : (
        t("action.addCart")
      )}
    </button>
  );
}
