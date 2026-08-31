"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { useLocale } from "@/hooks/useLocale";

export function ChatLauncher() {
  const pathname = usePathname();
  const { t } = useLocale();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  if (
    pathname === "/" ||
    pathname === "/home" ||
    pathname === "/chat" ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/onboarding" ||
    pathname === "/settings" ||
    pathname === "/forgot-password" ||
    pathname.startsWith("/use")
  ) {
    return null;
  }

  return (
    <Link
      href="/chat"
      className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-lg bg-[#3b82f6] px-4 py-3 text-sm text-white shadow-lg shadow-blue-500/20 hover:bg-[#2563eb]"
    >
      <MessageCircle className="h-4 w-4" />
      {t("chat.askGuide")}
    </Link>
  );
}
