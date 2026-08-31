"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useLocale } from "@/hooks/useLocale";
import { UserAvatar } from "@/components/UserAvatar";
import { localizedDisplayName } from "@/lib/i18n/localize-copy";
import { resolveAvatarUrl } from "@/lib/avatars";

function accountLabel(
  name: string | null | undefined,
  email: string | null | undefined,
  fallback: string,
  locale: string
) {
  const localized = localizedDisplayName(name, locale)?.trim();
  if (localized) return localized;
  const fromEmail = email?.split("@")[0]?.trim();
  if (fromEmail) return fromEmail;
  return fallback;
}

export function UserMenu() {
  const { user, loading, logout } = useAuth();
  const { t, locale } = useLocale();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (loading || !user) {
    return null;
  }

  const label = accountLabel(
    user.name,
    user.email,
    t("common.account"),
    locale
  );
  const avatarSrc = resolveAvatarUrl(user.avatarUrl, user.id);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center rounded-full p-0.5 text-sm text-zinc-300 transition hover:ring-2 hover:ring-[#7c5cff]/50 sm:p-1"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={label}
      >
        <UserAvatar src={avatarSrc} alt={label} size={32} />
      </button>
      {open && (
        <div className="absolute end-0 top-full z-50 mt-2 w-56 rounded-xl border border-white/10 bg-[#12151c] py-2 shadow-lg">
          <div className="flex items-center gap-3 border-b border-white/5 px-4 py-3">
            <UserAvatar src={avatarSrc} alt={label} size={40} />
            <div className="min-w-0">
              <p className="truncate text-sm text-zinc-100">{label}</p>
              <p className="truncate text-xs text-zinc-500">{user.email}</p>
            </div>
          </div>
          <Link
            href="/account"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm text-zinc-300 hover:bg-white/5"
          >
            {t("nav.account")}
          </Link>
          <button
            type="button"
            onClick={async () => {
              await logout();
              setOpen(false);
              router.push("/");
              router.refresh();
            }}
            className="block w-full px-4 py-2 text-start text-sm text-zinc-500 hover:bg-white/5"
          >
            {t("nav.logout")}
          </button>
        </div>
      )}
    </div>
  );
}
