"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { TechBackdrop } from "@/components/TechBackdrop";
import {
  backgroundIntensityForPath,
  resolveVisualTier,
  type VisualTier,
} from "@/lib/visual-capability";

const FuturisticCanvas = dynamic(() => import("@/components/FuturisticCanvas"), {
  ssr: false,
  loading: () => null,
});

function StaticFallback({ pureBlack }: { pureBlack: boolean }) {
  return (
    <div className="absolute inset-0" aria-hidden>
      <div
        className={`absolute inset-0 ${
          pureBlack
            ? "bg-black"
            : "bg-[radial-gradient(ellipse_90%_70%_at_50%_-10%,#132038_0%,#0b0d10_58%,#08090c_100%)]"
        }`}
      />
      {!pureBlack ? <TechBackdrop className="opacity-80" /> : null}
      {!pureBlack ? (
        <div className="fx-breath absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.12),transparent_45%),radial-gradient(circle_at_70%_60%,rgba(34,211,238,0.08),transparent_40%)]" />
      ) : null}
    </div>
  );
}

/**
 * Site-wide futuristic background: Three.js when capable, TechBackdrop when not.
 * Landing (`/`) skips — it owns Hyperspeed.
 */
export function FuturisticBackground() {
  const pathname = usePathname();
  const intensity = backgroundIntensityForPath(pathname);
  const [tier, setTier] = useState<VisualTier>("lite");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setTier(resolveVisualTier());
  }, []);

  if (!mounted || intensity === "off") return null;

  const rich = intensity === "rich";
  const pureBlack =
    Boolean(pathname?.startsWith("/chat")) ||
    Boolean(pathname?.startsWith("/products"));

  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden
      data-fx-bg={intensity}
      data-fx-tier={tier}
    >
      {tier === "off" ? (
        <div className={`absolute inset-0 ${pureBlack ? "bg-black" : "bg-[#0b0d10]"}`} />
      ) : tier === "lite" ? (
        <StaticFallback pureBlack={pureBlack} />
      ) : (
        <>
          <div className={`absolute inset-0 ${pureBlack ? "bg-black" : "bg-[#05070c]"}`} />
          <FuturisticCanvas intensity={rich ? "rich" : "subtle"} />
          {!pureBlack ? (
            <div
              className={`pointer-events-none absolute inset-0 ${
                rich
                  ? "bg-gradient-to-b from-[#05070c]/35 via-transparent to-[#05070c]/75"
                  : "bg-gradient-to-b from-[#05070c]/55 via-[#05070c]/25 to-[#05070c]/8"
              }`}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
