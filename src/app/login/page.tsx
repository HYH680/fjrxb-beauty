"use client";

import { useState, Suspense, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { AuthLayout, AUTH_INPUT, AUTH_BTN, AUTH_LINK } from "@/components/AuthLayout";
import { useAuth } from "@/hooks/useAuth";
import { useLocale } from "@/hooks/useLocale";

function LoginForm() {
  const router = useRouter();
  const { refresh } = useAuth();
  const { t } = useLocale();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/home";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  useEffect(() => {
    try {
      const pre = sessionStorage.getItem("login_email_prefill");
      if (pre) {
        setEmail(pre);
        sessionStorage.removeItem("login_email_prefill");
      }
    } catch {
      /* ignore */
    }
    void fetch("/api/auth/forgot-password")
      .then((res) => res.json())
      .then((data) => setResetOpen(Boolean(data.open)))
      .catch(() => setResetOpen(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || t("auth.loginFailed"));
        return;
      }

      const next = data.user?.occupation
        ? callbackUrl === "/"
          ? "/home"
          : callbackUrl
        : "/onboarding";
      await refresh();
      router.push(next);
      router.refresh();
    } catch {
      setError(t("common.networkError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title={t("auth.welcomeBack")} subtitle={t("auth.loginSubtitle")}>
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {error ? (
          <div
            role="alert"
            className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
          >
            {error}
          </div>
        ) : null}

        <div>
          <label htmlFor="login-email" className="mb-1.5 block text-sm text-zinc-500">
            {t("common.email")}
          </label>
          <input
            id="login-email"
            type="email"
            name="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={AUTH_INPUT}
            placeholder={t("common.email")}
          />
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <label htmlFor="login-password" className="text-sm text-zinc-500">
              {t("common.password")}
            </label>
            {resetOpen ? (
              <Link href="/forgot-password" className={`text-xs ${AUTH_LINK}`}>
                {t("auth.forgotPassword")}
              </Link>
            ) : (
              <span className="text-xs text-zinc-600">{t("auth.resetNeedAdmin")}</span>
            )}
          </div>
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              name="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${AUTH_INPUT} pr-10`}
              placeholder={t("auth.enterPassword")}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 transition-colors hover:text-zinc-300"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <button type="submit" disabled={loading} className={AUTH_BTN}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {t("nav.login")}
        </button>

        <p className="text-center text-sm text-zinc-500">
          {t("auth.noAccount")}{" "}
          <Link href="/register" className={AUTH_LINK}>
            {t("auth.goRegister")}
          </Link>
        </p>
        <p className="text-center text-sm text-zinc-500">
          <Link href="/" className="text-zinc-400 transition-colors hover:text-[#e0b07a] hover:underline">
            {t("auth.backHome")}
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}

function LoginFallback() {
  const { t } = useLocale();
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f0d0b] text-stone-400">
      {t("common.loading")}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}
