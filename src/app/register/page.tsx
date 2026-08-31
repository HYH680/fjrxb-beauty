"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";
import { AVATAR_PRESETS, defaultAvatarUrlForUserId } from "@/lib/avatars";
import { AvatarPicker } from "@/components/AvatarPicker";
import { AuthLayout, AUTH_INPUT, AUTH_BTN, AUTH_LINK } from "@/components/AuthLayout";
import { useAuth } from "@/hooks/useAuth";
import { useLocale } from "@/hooks/useLocale";

export default function RegisterPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const { t } = useLocale();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    avatarUrl: AVATAR_PRESETS[0]?.url ?? defaultAvatarUrlForUserId("guest"),
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const pre = sessionStorage.getItem("register_email_prefill");
      if (pre) {
        sessionStorage.removeItem("register_email_prefill");
        setForm((f) => ({ ...f, email: pre }));
      }
    } catch {
      /* ignore */
    }
  }, []);

  const passwordChecks = [
    { label: t("auth.pwdMin"), ok: form.password.length >= 8 },
    { label: t("auth.pwdLetter"), ok: /[A-Za-z]/.test(form.password) },
    { label: t("auth.pwdDigit"), ok: /[0-9]/.test(form.password) },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError(t("auth.passwordMismatch"));
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          avatarUrl: form.avatarUrl,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || t("auth.registerFailed"));
        return;
      }

      await refresh();
      router.push("/onboarding");
      router.refresh();
    } catch {
      setError(t("common.networkError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title={t("auth.createAccount")} subtitle={t("auth.registerSubtitle")}>
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-sm text-zinc-500">{t("common.name")}</label>
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={AUTH_INPUT}
            placeholder={t("common.name")}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-zinc-500">{t("common.email")}</label>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className={AUTH_INPUT}
            placeholder={t("common.email")}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-zinc-500">{t("common.password")}</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className={`${AUTH_INPUT} pr-10`}
              placeholder={t("common.password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {form.password && (
            <div className="mt-2 flex flex-wrap gap-2">
              {passwordChecks.map((c) => (
                <span
                  key={c.label}
                  className={`flex items-center gap-1 text-xs ${c.ok ? "text-emerald-400" : "text-zinc-600"}`}
                >
                  <CheckCircle2 className="h-3 w-3" />
                  {c.label}
                </span>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-zinc-500">{t("auth.confirmPassword")}</label>
          <input
            type="password"
            required
            value={form.confirmPassword}
            onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
            className={AUTH_INPUT}
            placeholder={t("auth.confirmPassword")}
          />
        </div>

        <div>
          <AvatarPicker
            value={form.avatarUrl}
            onChange={(avatarUrl) => setForm({ ...form, avatarUrl })}
            compact
          />
        </div>

        <button type="submit" disabled={loading} className={AUTH_BTN}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {t("auth.register")}
        </button>

        <p className="text-center text-sm text-zinc-500">
          {t("auth.hasAccount")}{" "}
          <Link href="/login" className={AUTH_LINK}>
            {t("auth.goLoginNow")}
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
