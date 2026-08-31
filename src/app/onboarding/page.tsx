"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  Check,
  LoaderCircle,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { DarkShell } from "@/components/DarkShell";
import { Header } from "@/components/Header";
import { useLocale } from "@/hooks/useLocale";

const INDUSTRIES = [
  "互联网 / 软件",
  "电商零售",
  "跨境电商",
  "餐饮",
  "教育培训",
  "内容与媒体",
  "金融",
  "制造",
  "法律 / 合同",
  "医疗健康",
  "咨询服务",
  "学生",
  "其他",
];

const OCCUPATIONS = [
  "创始人 / 负责人",
  "店长",
  "客服",
  "产品",
  "研发",
  "运营",
  "设计",
  "市场",
  "财务",
  "学生",
  "其他",
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading: authLoading, refresh } = useAuth();
  const { t } = useLocale();
  const [industryChoice, setIndustryChoice] = useState<string | null>(null);
  const [occupationChoice, setOccupationChoice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const industry = industryChoice ?? user?.industry ?? "";
  const occupation = occupationChoice ?? user?.occupation ?? "";
  const isEditing = Boolean(user?.industry && user?.occupation);

  const submit = async () => {
    if (!industry || !occupation) {
      setError(t("onboarding.required"));
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ industry, occupation }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || t("onboarding.saveFailed"));
        return;
      }
      await refresh();
      router.push(isEditing ? "/account" : "/home");
      router.refresh();
    } catch {
      setError(t("common.networkError"));
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="landing-root flex min-h-screen items-center justify-center bg-[#0b0d10] text-sm text-zinc-500">
        <DarkShell />
        {t("common.loading")}
      </div>
    );
  }

  return (
    <div className="landing-root relative flex min-h-[100dvh] flex-col overflow-hidden bg-[#090b10] text-zinc-100">
      <DarkShell />
      <div
        className="pointer-events-none fixed left-1/2 top-[-18rem] h-[38rem] w-[52rem] -translate-x-1/2 rounded-full bg-sky-500/[0.11] blur-[130px]"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed bottom-[-18rem] right-[-10rem] h-[34rem] w-[34rem] rounded-full bg-indigo-500/[0.09] blur-[120px]"
        aria-hidden
      />
      <Header />

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 items-center px-4 py-8 sm:px-6 sm:py-12">
        <div className="w-full overflow-hidden rounded-[28px] border border-white/[0.11] bg-white/[0.055] shadow-[0_32px_100px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
          <div className="border-b border-white/[0.08] px-5 py-6 sm:px-8 sm:py-8 lg:px-10">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-sky-300/80">
              <Sparkles className="size-4" aria-hidden />
              {t("onboarding.eyebrow")}
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-white sm:text-4xl">
              {t("onboarding.title")}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-400 sm:text-[15px]">
              {t("onboarding.subtitle")}
            </p>
          </div>

          <div className="grid gap-4 p-4 sm:gap-5 sm:p-6 lg:grid-cols-[1.15fr_0.85fr] lg:p-8">
            <section className="rounded-2xl border border-white/[0.09] bg-black/25 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] sm:p-6">
              <div className="mb-5 flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-sky-400/20 bg-sky-400/10 text-sky-300">
                  <Building2 className="size-5" aria-hidden />
                </div>
                <div>
                  <h2 className="font-medium text-zinc-100">{t("onboarding.industry")}</h2>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">
                    {t("onboarding.industryHint")}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {INDUSTRIES.map((item) => {
                  const selected = industry === item;
                  return (
                    <button
                      key={item}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => {
                        setIndustryChoice(item);
                        setError("");
                      }}
                      className={`ui-press relative min-h-12 rounded-xl border px-3 py-2.5 text-sm transition-[border-color,background-color,color,box-shadow,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c0e13] active:scale-[0.98] ${
                        selected
                          ? "border-sky-400/65 bg-sky-400/[0.16] text-sky-100 shadow-[0_0_24px_rgba(56,189,248,0.09)]"
                          : "border-white/[0.09] bg-white/[0.035] text-zinc-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.07] hover:text-white"
                      }`}
                    >
                      {selected ? (
                        <Check className="absolute right-2 top-2 size-3.5 text-sky-300" aria-hidden />
                      ) : null}
                      {item}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="rounded-2xl border border-white/[0.09] bg-black/25 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] sm:p-6">
              <div className="mb-5 flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-indigo-400/20 bg-indigo-400/10 text-indigo-300">
                  <BriefcaseBusiness className="size-5" aria-hidden />
                </div>
                <div>
                  <h2 className="font-medium text-zinc-100">{t("onboarding.occupation")}</h2>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">
                    {t("onboarding.occupationHint")}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {OCCUPATIONS.map((item) => {
                  const selected = occupation === item;
                  return (
                    <button
                      key={item}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => {
                        setOccupationChoice(item);
                        setError("");
                      }}
                      className={`ui-press relative min-h-12 rounded-xl border px-3 py-2.5 text-sm transition-[border-color,background-color,color,box-shadow,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c0e13] active:scale-[0.98] ${
                        selected
                          ? "border-indigo-400/65 bg-indigo-400/[0.16] text-indigo-100 shadow-[0_0_24px_rgba(129,140,248,0.09)]"
                          : "border-white/[0.09] bg-white/[0.035] text-zinc-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.07] hover:text-white"
                      }`}
                    >
                      {selected ? (
                        <Check
                          className="absolute right-2 top-2 size-3.5 text-indigo-300"
                          aria-hidden
                        />
                      ) : null}
                      {item}
                    </button>
                  );
                })}
              </div>
            </section>
          </div>

          <div className="flex flex-col gap-4 border-t border-white/[0.08] bg-black/20 px-5 py-5 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-10">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
                {t("onboarding.selection")}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                <span className="rounded-lg border border-white/[0.09] bg-white/[0.04] px-3 py-1.5 text-zinc-300">
                  {industry || t("onboarding.notSelected")}
                </span>
                <ArrowRight className="size-4 text-zinc-600" aria-hidden />
                <span className="rounded-lg border border-white/[0.09] bg-white/[0.04] px-3 py-1.5 text-zinc-300">
                  {occupation || t("onboarding.notSelected")}
                </span>
              </div>
              {error ? (
                <p className="mt-2 text-sm text-rose-300" role="alert">
                  {error}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              {isEditing ? (
                <Link
                  href="/account"
                  className="ui-press inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.035] px-5 text-sm font-medium text-zinc-300 transition-[border-color,background-color,color,transform] duration-200 hover:border-white/25 hover:bg-white/[0.07] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black active:scale-[0.98]"
                >
                  <ArrowLeft className="size-4" aria-hidden />
                  {t("onboarding.backAccount")}
                </Link>
              ) : null}
              <button
                type="button"
                onClick={() => void submit()}
                disabled={loading || !industry || !occupation}
                className="ui-press inline-flex min-h-11 min-w-48 items-center justify-center gap-2 rounded-xl border border-sky-300/40 bg-sky-400 px-5 text-sm font-semibold text-slate-950 shadow-[0_12px_32px_rgba(56,189,248,0.18)] transition-[background-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:bg-sky-300 hover:shadow-[0_16px_38px_rgba(56,189,248,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 disabled:hover:shadow-none"
              >
                {loading ? (
                  <LoaderCircle className="size-4 animate-spin" aria-hidden />
                ) : (
                  <ArrowRight className="size-4" aria-hidden />
                )}
                {loading
                  ? t("account.saving")
                  : isEditing
                    ? t("onboarding.saveChanges")
                    : t("onboarding.enterWorkspace")}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
