"use client";

import Link from "next/link";
import { useLocale } from "@/hooks/useLocale";
import { SCENE_LABEL_KEYS, SHELF_SCENES } from "@/lib/product-meta";

export function SiteFooter() {
  const { t, tf } = useLocale();
  const year = new Date().getFullYear();

  return (
    <footer className="relative mt-16 border-t border-cyan-400/10 bg-black/40 backdrop-blur-xl">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/35 to-transparent"
        aria-hidden
      />
      <div className="mx-auto grid max-w-[1560px] gap-10 px-4 py-12 sm:px-6 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-sm font-semibold tracking-tight text-zinc-100">
            {t("brand.name")}
          </p>
          <p className="mt-3 max-w-sm text-xs leading-6 text-zinc-500">
            {t("footer.aboutLead")}
          </p>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
            {t("footer.explore")}
          </p>
          <nav className="mt-3 flex flex-col gap-2 text-sm text-zinc-400">
            <Link className="hover:text-cyan-200" href="/products">
              {t("nav.services")}
            </Link>
            <Link className="hover:text-cyan-200" href="/rank">
              {t("catalog.rank")}
            </Link>
            <Link className="hover:text-cyan-200" href="/collections">
              {t("catalog.collections")}
            </Link>
            <Link className="hover:text-cyan-200" href="/chat">
              {t("nav.guide")}
            </Link>
          </nav>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
            {t("footer.scenes")}
          </p>
          <nav className="mt-3 flex flex-col gap-2 text-sm text-zinc-400">
            {SHELF_SCENES.map((scene) => (
              <Link
                key={scene}
                className="hover:text-violet-200"
                href={`/products?scene=${scene}`}
              >
                {t(SCENE_LABEL_KEYS[scene])}
              </Link>
            ))}
          </nav>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
            {t("footer.legal")}
          </p>
          <p className="mt-3 text-xs leading-6 text-zinc-500">{t("footer.icp")}</p>
          <p className="mt-4 text-xs text-zinc-600">
            {tf("footer.rights", { year })}
          </p>
        </div>
      </div>
    </footer>
  );
}
