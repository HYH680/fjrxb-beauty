"use client";

import Link from "next/link";
import { useLocale } from "@/hooks/useLocale";

/**
 * Landing right panel: what happens after you start (activate → match → workspace).
 * Replaces the dense model wall as the primary trust narrative.
 */
export function LandingFlowPanel() {
  const { t } = useLocale();

  const steps = [
    {
      n: "1",
      title: t("landing.flowStep1Title"),
      body: t("landing.flowStep1Body"),
    },
    {
      n: "2",
      title: t("landing.flowStep2Title"),
      body: t("landing.flowStep2Body"),
    },
    {
      n: "3",
      title: t("landing.flowStep3Title"),
      body: t("landing.flowStep3Body"),
    },
  ] as const;

  return (
    <div
      className="relative w-full max-w-[min(100%,520px)]"
      data-landing-flow-panel
    >
      <div className="overflow-hidden rounded-xl border border-white/12 bg-[#0c0e12]/92 shadow-[0_28px_90px_rgba(0,0,0,0.55)] backdrop-blur-xl">
        <div className="border-b border-white/8 px-4 py-3">
          <p className="text-[11px] font-medium tracking-[0.14em] text-[color:var(--brand-accent-soft,#a78bfa)]">
            {t("landing.flowTitle")}
          </p>
        </div>

        <ol className="space-y-0 px-2 py-2">
          {steps.map((step) => (
            <li
              key={step.n}
              className="flex gap-3 rounded-lg px-2.5 py-3 transition-colors hover:bg-white/[0.03]"
            >
              <span
                className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-xs font-semibold text-zinc-200"
                aria-hidden
              >
                {step.n}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-100">{step.title}</p>
                <p className="mt-1 text-[12px] leading-5 text-zinc-500">
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>

        <div className="flex items-center justify-between gap-2 border-t border-white/8 px-4 py-2.5 text-[11px] text-zinc-500">
          <span>{t("landing.flowProof")}</span>
          <Link
            href="/products"
            className="shrink-0 text-[color:var(--brand-accent-soft,#a78bfa)] hover:underline"
          >
            {t("nav.services")}
          </Link>
        </div>
      </div>
    </div>
  );
}
