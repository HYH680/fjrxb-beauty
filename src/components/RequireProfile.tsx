"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { DarkShell } from "@/components/DarkShell";

export function RequireProfile({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      const softEntry =
        pathname === "/home" ||
        pathname?.startsWith("/home/") ||
        pathname === "/onboarding" ||
        pathname?.startsWith("/onboarding/");
      router.replace(
        softEntry
          ? "/"
          : `/login?callbackUrl=${encodeURIComponent(pathname || "/home")}`
      );
      return;
    }
    if (!user.occupation && pathname !== "/onboarding") {
      router.replace("/onboarding");
    }
  }, [user, loading, router, pathname]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b0d10] text-sm text-zinc-500">
        <DarkShell />
        加载中…
      </div>
    );
  }

  if (!user.occupation && pathname !== "/onboarding") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b0d10] text-sm text-zinc-500">
        <DarkShell />
        先完善资料…
      </div>
    );
  }

  return (
    <>
      <DarkShell />
      {children}
    </>
  );
}
