"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, SlidersHorizontal } from "lucide-react";
import { Header } from "@/components/Header";
import { useAuth } from "@/hooks/useAuth";
import { AUTH_BTN, AUTH_INPUT } from "@/components/AuthLayout";
import { AvatarPicker } from "@/components/AvatarPicker";
import { UserAvatar } from "@/components/UserAvatar";
import { IntegrationCapabilityPanel } from "@/components/IntegrationCapabilityPanel";
import { useLocale } from "@/hooks/useLocale";
import { localizedDisplayName } from "@/lib/i18n/localize-copy";
import { resolveAvatarUrl, AVATAR_PRESETS } from "@/lib/avatars";

type CapabilitiesPayload = {
  capabilities?: {
    id: string;
    track: string;
    label: string;
    on: boolean;
    switches: string[];
    whenOn: string;
    whenOff: string;
    live?: "up" | "down" | "skip";
    toggleable?: boolean;
  }[];
};

export default function AccountPage() {
  const router = useRouter();
  const { user, loading, logout, refresh, setUser } = useAuth();
  const { t, locale } = useLocale();
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdMessage, setPwdMessage] = useState("");
  const [pwdError, setPwdError] = useState("");
  const [pwdSaving, setPwdSaving] = useState(false);
  const [capabilities, setCapabilities] = useState<CapabilitiesPayload["capabilities"]>();
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarMessage, setAvatarMessage] = useState("");
  const [avatarError, setAvatarError] = useState("");
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (!user || user.isAdmin) return;
    fetch("/api/account/usage")
      .then((res) => res.json())
      .then((data: CapabilitiesPayload) => {
        if (data.capabilities) setCapabilities(data.capabilities);
      })
      .catch(() => undefined);
  }, [user]);

  if (loading) {
    return <div className="p-24 text-center text-zinc-500">{t("common.loading")}</div>;
  }

  if (!user) {
    return (
      <div className="relative min-h-screen bg-transparent text-zinc-100">
        <Header />
        <div className="px-4 py-24 text-center">
          <p className="mb-3 text-zinc-400">{t("account.needLogin")}</p>
          <Link href="/login?callbackUrl=/account" className="text-[#93c5fd] underline">
            {t("account.goLogin")}
          </Link>
        </div>
      </div>
    );
  }

  const effectiveAvatarUrl = avatarUrl || resolveAvatarUrl(user.avatarUrl, user.id);

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdSaving(true);
    setPwdError("");
    setPwdMessage("");
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, password, confirmPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPwdError(data.error || t("account.pwdFail"));
        return;
      }
      setCurrentPassword("");
      setPassword("");
      setConfirmPassword("");
      setPwdMessage(t("account.pwdUpdated"));
    } catch {
      setPwdError(t("common.networkError"));
    } finally {
      setPwdSaving(false);
    }
  };

  const saveAvatar = async () => {
    setAvatarSaving(true);
    setAvatarError("");
    setAvatarMessage("");
    try {
      const res = await fetch("/api/auth/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAvatarError(data.error || t("account.avatarFail"));
        return;
      }
      setUser({ ...user, avatarUrl: data.user?.avatarUrl ?? avatarUrl });
      setAvatarMessage(t("account.avatarSaved"));
      await refresh();
    } catch {
      setAvatarError(t("common.networkError"));
    } finally {
      setAvatarSaving(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] flex-col bg-transparent text-zinc-100">
      <Header />
      <div className="flex w-full flex-1 flex-col px-4 sm:px-6">
        <div className="grid h-[calc(100dvh-3.5rem)] min-h-0 w-full flex-1 items-stretch gap-10 sm:h-[calc(100dvh-4rem)] lg:grid-cols-2 lg:gap-16">
          {/* Left: profile + password */}
          <form
            onSubmit={changePassword}
            className="flex h-full min-h-0 flex-col py-6 lg:py-8"
          >
            <div className="min-h-0 flex-1 space-y-8 overflow-y-auto">
              <dl className="space-y-6 text-sm">
                <div>
                  <dt className="text-zinc-500">{t("common.name")}</dt>
                  <dd className="mt-1">
                    {localizedDisplayName(user.name, locale) || user.name}
                  </dd>
                </div>
                <div>
                  <dt className="text-zinc-500">{t("common.email")}</dt>
                  <dd className="mt-1">{user.email}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500">{t("account.industry")}</dt>
                  <dd className="mt-1">
                    {[user.industry, user.occupation].filter(Boolean).join(" · ") ||
                      t("account.industryEmpty")}
                  </dd>
                </div>
              </dl>

              <div className="grid gap-3 sm:grid-cols-2">
                <Link
                  href="/opened"
                  className="ui-press inline-flex min-h-11 items-center justify-center rounded-xl border border-white/15 bg-white/[0.05] px-4 text-sm font-medium text-zinc-200 transition-colors hover:border-violet-400/40 hover:text-white"
                >
                  {t("account.subscriptions")}
                </Link>
                <Link
                  href="/products"
                  className="ui-press inline-flex min-h-11 items-center justify-center rounded-xl border border-white/15 bg-white/[0.05] px-4 text-sm font-medium text-zinc-200 transition-colors hover:border-cyan-400/40 hover:text-white"
                >
                  {t("account.goCatalog")}
                </Link>
                <Link
                  href="/onboarding"
                  className="ui-press inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-sky-400/35 bg-sky-400/[0.07] px-4 text-sm font-medium text-sky-200 transition-[border-color,background-color,color,transform,box-shadow] duration-200 hover:border-sky-300/65 hover:bg-sky-400/[0.13] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black active:scale-[0.98]"
                >
                  <SlidersHorizontal className="size-4" aria-hidden />
                  {t("account.editProfile")}
                </Link>
                <button
                  type="button"
                  disabled={loggingOut}
                  onClick={async () => {
                    setLoggingOut(true);
                    try {
                      await logout();
                      router.push("/");
                      router.refresh();
                    } finally {
                      setLoggingOut(false);
                    }
                  }}
                  className="ui-press inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-rose-400/25 bg-rose-400/[0.05] px-4 text-sm font-medium text-rose-200 transition-[border-color,background-color,color,transform,box-shadow] duration-200 hover:border-rose-300/55 hover:bg-rose-400/[0.1] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <LogOut className="size-4" aria-hidden />
                  {loggingOut ? t("account.loggingOut") : t("nav.logout")}
                </button>
              </div>

              {capabilities && !user.isAdmin ? (
                <IntegrationCapabilityPanel capabilities={capabilities} canToggle={false} />
              ) : null}

              <div className="space-y-4">
                <h2 className="text-sm text-zinc-500">{t("account.changePassword")}</h2>
                <label className="block">
                  <span className="mb-1.5 block text-sm text-zinc-500">
                    {t("account.currentPassword")}
                  </span>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className={AUTH_INPUT}
                    autoComplete="current-password"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm text-zinc-500">
                    {t("account.newPassword")}
                  </span>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={AUTH_INPUT}
                    placeholder={t("auth.passwordHint")}
                    autoComplete="new-password"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm text-zinc-500">
                    {t("account.confirmNewPassword")}
                  </span>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={AUTH_INPUT}
                    autoComplete="new-password"
                  />
                </label>
              </div>
            </div>

            <div className="mt-auto shrink-0 space-y-2 pt-5">
              {pwdError && <p className="text-sm text-red-400">{pwdError}</p>}
              {pwdMessage && <p className="text-sm text-emerald-400">{pwdMessage}</p>}
              <button type="submit" disabled={pwdSaving} className={`${AUTH_BTN} w-auto px-5`}>
                {pwdSaving ? t("account.saving") : t("account.updatePassword")}
              </button>
            </div>
          </form>

          {/* Right: avatar */}
          <div className="flex h-full min-h-0 flex-col py-6 lg:py-8">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
              <h2 className="text-sm text-zinc-500">{t("account.avatar")}</h2>
              <div className="flex items-center gap-3">
                <UserAvatar src={effectiveAvatarUrl} alt={user.name} size={56} />
                <div className="min-w-0">
                  <p className="text-sm text-zinc-300">{t("avatar.choose")}</p>
                  <p className="mt-0.5 text-xs text-zinc-500">{t("avatar.hint")}</p>
                </div>
              </div>
              <AvatarPicker
                value={effectiveAvatarUrl || AVATAR_PRESETS[0]!.url}
                onChange={setAvatarUrl}
                allowUpload
                showHeader={false}
                onUploaded={(url) => {
                  setAvatarUrl(url);
                  setUser({ ...user, avatarUrl: url });
                  setAvatarMessage(t("account.avatarSaved"));
                  setAvatarError("");
                }}
              />
            </div>

            <div className="mt-auto shrink-0 space-y-2 pt-5">
              {avatarError && <p className="text-sm text-red-400">{avatarError}</p>}
              {avatarMessage && <p className="text-sm text-emerald-400">{avatarMessage}</p>}
              <button
                type="button"
                disabled={avatarSaving || !avatarUrl}
                onClick={() => void saveAvatar()}
                className={`${AUTH_BTN} w-auto px-5`}
              >
                {avatarSaving ? t("account.saving") : t("avatar.save")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
