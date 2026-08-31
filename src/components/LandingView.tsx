"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DarkShell } from "@/components/DarkShell";
import { Header } from "@/components/Header";
import { LandingHyperspeed } from "@/components/LandingHyperspeed";
import { LandingModelPanel } from "@/components/LandingModelPanel";
import { useLocale } from "@/hooks/useLocale";

const CurvedInput = dynamic(
  () => import("@/components/react-bits/CurvedInput"),
  {
    ssr: false,
    loading: () => (
      <div
        className="h-14 w-full max-w-[460px] animate-pulse rounded-2xl bg-white/5"
        aria-hidden
      />
    ),
  }
);

/**
 * Landing: Hyperspeed background + copy + CurvedInput + models panel.
 */
export function LandingView() {
  const { t } = useLocale();
  const router = useRouter();
  const [email, setEmail] = useState("");

  const browseTools = () => {
    router.push("/products");
  };

  const goLogin = () => {
    const v = email.trim();
    if (v && typeof window !== "undefined") {
      try {
        sessionStorage.setItem("login_email_prefill", v);
      } catch {
        /* ignore */
      }
    }
    router.push("/login");
  };

  return (
    <div className="landing-root relative min-h-screen overflow-hidden bg-black text-zinc-100">
      <DarkShell />
      <LandingHyperspeed />
      <div className="relative z-10 flex min-h-screen flex-col">
        <Header />
        <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6 lg:px-10">
          <div className="mx-auto flex w-full max-w-[1200px] flex-col items-stretch gap-12 lg:flex-row lg:items-center lg:justify-between lg:gap-10 xl:gap-14">
            <div className="flex w-full max-w-lg shrink-0 flex-col justify-center text-start lg:max-w-[460px] xl:max-w-[500px]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-violet-300/80">
                {t("landing.catalogEyebrow")}
              </p>
              <h1 className="mt-4 text-4xl font-semibold leading-[1.08] tracking-[-0.045em] text-white sm:text-5xl">
                {t("catalog.heroTitle")}
              </h1>
              <p className="mt-5 text-[15px] font-medium leading-7 text-zinc-300 sm:text-base sm:leading-7">
                {t("landing.lead")}
              </p>
              <p className="mt-3 max-w-sm text-sm leading-6 text-zinc-500">
                {t("landing.sub")}
              </p>

              <div className="landing-curved-slot mt-8 w-full max-w-[460px]" dir="ltr">
                <CurvedInput
                  className="landing-curved-login"
                  width="100%"
                  bend={22}
                  height={56}
                  theme="dark"
                  type="email"
                  showIcon
                  showButton
                  showSecondaryButton
                  buttonText={t("landing.start")}
                  secondaryButtonText={t("landing.browseTools")}
                  onSecondaryClick={browseTools}
                  secondaryButtonColor="rgba(255,255,255,0.14)"
                  placeholder={t("landing.emailPlaceholder")}
                  value={email}
                  onChange={setEmail}
                  onSubmit={goLogin}
                  buttonColor="#7c5cff"
                  backgroundColor="#121018"
                  borderColor="#3a3350"
                />
              </div>
            </div>

            <div className="flex w-full min-w-0 flex-1 items-center justify-center lg:justify-end">
              <LandingModelPanel />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
