"use client";

import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";
import { useLocale } from "@/hooks/useLocale";

const BRAND_EN = "AI AGENT MART";

export function BrandLogo({
  href = "/",
  size = "md",
  className = "",
  stacked = false,
}: {
  href?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  stacked?: boolean;
}) {
  const { t } = useLocale();
  const brandName = t("brand.name");
  const mark =
    size === "sm" ? "h-8 w-auto" : size === "lg" ? "h-12 w-auto" : "h-9 w-auto";
  const title =
    size === "sm"
      ? "text-[13px] sm:text-[14px]"
      : size === "lg"
        ? "text-[18px] sm:text-[20px]"
        : "text-[14px] sm:text-[15px]";

  return (
    <Link
      href={href}
      className={`group flex items-center gap-2.5 ${className}`.trim()}
      aria-label={brandName}
    >
      <BrandMark className={`${mark} transition-transform duration-300 group-hover:scale-[1.04]`} />
      <span className={stacked ? "flex flex-col leading-none" : undefined}>
        <span
          className={`${title} font-semibold tracking-tight text-zinc-50`}
          style={{ fontFamily: "var(--font-brand, inherit)" }}
        >
          {brandName}
        </span>
        {stacked ? (
          <span className="mt-1.5 text-[8px] font-medium uppercase tracking-[0.2em] text-cyan-400/70">
            {BRAND_EN}
          </span>
        ) : null}
      </span>
    </Link>
  );
}

/** @deprecated Prefer useLocale().t("brand.name") in UI */
export const BRAND_NAME = "AI 智能体超市";
export { BRAND_EN };
