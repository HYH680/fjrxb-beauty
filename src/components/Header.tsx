"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useLocale } from "@/hooks/useLocale";
import PillNav from "@/components/react-bits/PillNav";
import { resolveAvatarUrl } from "@/lib/avatars";

/** 全站顶栏：药丸导航（头像 + 首页 / 导购 / 服务 / 已开通 / 语言） */
export function Header() {
  const { user, loading } = useAuth();
  const { t } = useLocale();
  const pathname = usePathname() || "/";

  const openedHref = user ? "/opened" : "/login?callbackUrl=/opened";
  const logoHref = loading
    ? "/"
    : user
      ? "/account"
      : "/login?callbackUrl=/account";
  const logoSrc = user
    ? resolveAvatarUrl(user.avatarUrl, user.id)
    : "/logo.png";

  const items = [
    { href: "/", label: t("nav.home") },
    { href: "/chat", label: t("nav.guide") },
    { href: "/products", label: t("nav.services") },
    { href: openedHref, label: t("nav.opened") },
    { href: "#language", label: t("nav.language"), action: "language" as const },
  ];

  const activeHref =
    pathname === "/"
      ? "/"
      : pathname.startsWith("/chat")
        ? "/chat"
        : pathname.startsWith("/products") ||
            pathname.startsWith("/tools/") ||
            pathname.startsWith("/rank") ||
            pathname.startsWith("/collections") ||
            pathname.startsWith("/use/")
          ? "/products"
          : pathname.startsWith("/opened")
            ? openedHref
            : pathname;

  return (
    <header className="sticky top-0 z-50 shrink-0 bg-black/45 backdrop-blur-md">
      <div className="relative mx-auto flex min-h-14 max-w-7xl items-center justify-center px-4 py-2.5 sm:min-h-16 sm:px-6">
        <PillNav
          logo={logoSrc}
          logoAlt={user?.name || t("brand.name")}
          logoHref={logoHref}
          items={items}
          activeHref={activeHref}
          menuAriaLabel={t("nav.toggleMenu")}
          baseColor="#f4f4f5"
          pillColor="#000000"
          hoveredPillTextColor="#000000"
          pillTextColor="#ffffff"
        />
      </div>
    </header>
  );
}
