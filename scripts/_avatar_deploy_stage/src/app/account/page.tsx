"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { useAuth } from "@/hooks/useAuth";
import { AUTH_BTN, AUTH_INPUT } from "@/components/AuthLayout";
import { AvatarPicker } from "@/components/AvatarPicker";
import { UserAvatar } from "@/components/UserAvatar";
import { IntegrationCapabilityPanel } from "@/components/IntegrationCapabilityPanel";
import { SubscriptionList } from "@/components/SubscriptionList";
import { useSubscriptions } from "@/hooks/useSubscriptions";
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
  const { user, loading, refresh, setUser } = useAuth();
  const { t, locale } = useLocale();
  const { subscriptions, loading: subsLoading } = useSubscriptions();
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

  useEffect(() => {
    if (!user) return;
    setAvatarUrl(resolveAvatarUrl(user.avatarUrl, user.id));
  }, [user]);

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

  return (
    <div className="relative min-h-screen bg-transparent text-zinc-100">
      <Header />
      <div className="mx-auto max-w-xl px-4 py-12 sm:px-6">
        <h1 className="text-4xl font-semibold tracking-tight">{t("account.title")}</h1>
        <dl className="mt-10 space-y-6 text-sm">
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
          {(user.industry || user.occupation) && (
            <div>
              <dt className="text-zinc-500">{t("account.industry")}</dt>
              <dd className="mt-1">
                {[user.industry, user.occupation].filter(Boolean).join(" · ")}
              </dd>
            </div>
          )}
        </dl>

        <div className="mt-10 space-y-4">
          <h2 className="text-sm text-zinc-500">{t("account.avatar")}</h2>
          <div className="flex items-center gap-3">
            <UserAvatar src={avatarUrl} alt={user.name} size={56} />
            <p className="text-xs text-zinc-500">{t("avatar.hint")}</p>
          </div>
          <AvatarPicker
            value={avatarUrl || AVATAR_PRESETS[0]!.url}
            onChange={setAvatarUrl}
            allowUpload
            onUploaded={(url) => {
              setAvatarUrl(url);
              setUser({ ...user, avatarUrl: url });
              setAvatarMessage(t("account.avatarSaved"));
              setAvatarError("");
            }}
          />
          <button
            type="button"
            disabled={avatarSaving || !avatarUrl}
            onClick={async () => {
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
            }}
            className={`${AUTH_BTN} w-auto px-5`}
          >
            {avatarSaving ? t("account.saving") : t("avatar.save")}
          </button>
          {avatarError && <p className="text-sm text-red-400">{avatarError}</p>}
          {avatarMessage && <p className="text-sm text-emerald-400">{avatarMessage}</p>}
        </div>

        <div className="mt-10">
          <h2 className="text-sm text-zinc-500">{t("account.subscriptions")}</h2>
          {subsLoading ? (
            <p className="mt-3 text-sm text-zinc-500">{t("common.loading")}</p>
          ) : subscriptions.filter((s) => s.status === "active" || s.status === "paid").length === 0 ? (
            <p className="mt-3 text-sm text-zinc-400">{t("account.noSubscriptions")}</p>
          ) : (
            <div className="mt-3">
              <SubscriptionList
                items={subscriptions.filter((s) => s.status === "active" || s.status === "paid")}
              />
            </div>
          )}
        </div>

        {capabilities && !user.isAdmin ? (
          <IntegrationCapabilityPanel capabilities={capabilities} canToggle={false} />
        ) : null}

        <Link href="/onboarding" className="mt-8 block text-sm text-zinc-500 hover:text-[#93c5fd]">
          {t("account.editProfile")}
        </Link>

        <form onSubmit={changePassword} className="mt-12 space-y-4">
          <h2 className="text-sm text-zinc-500">{t("account.changePassword")}</h2>
          <label className="block">
            <span className="mb-1.5 block text-sm text-zinc-500">{t("account.currentPassword")}</span>
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
            <span className="mb-1.5 block text-sm text-zinc-500">{t("account.newPassword")}</span>
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
            <span className="mb-1.5 block text-sm text-zinc-500">{t("account.confirmNewPassword")}</span>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={AUTH_INPUT}
              autoComplete="new-password"
            />
          </label>
          {pwdError && <p className="text-sm text-red-400">{pwdError}</p>}
          {pwdMessage && <p className="text-sm text-emerald-400">{pwdMessage}</p>}
          <button type="submit" disabled={pwdSaving} className={`${AUTH_BTN} w-auto px-5`}>
            {pwdSaving ? t("account.saving") : t("account.updatePassword")}
          </button>
        </form>
      </div>
    </div>
  );
}
