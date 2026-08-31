/** Client-safe visual capability probes for background/motion fallbacks. */

export type VisualTier = "off" | "lite" | "full";

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function isCoarsePointer(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(pointer: coarse)").matches;
}

export function isNarrowViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.innerWidth < 768;
}

export function isLowEndDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean; effectiveType?: string };
  };
  if (nav.connection?.saveData) return true;
  const et = nav.connection?.effectiveType;
  if (et === "slow-2g" || et === "2g") return true;
  if (typeof nav.deviceMemory === "number" && nav.deviceMemory <= 2) return true;
  if (typeof nav.hardwareConcurrency === "number" && nav.hardwareConcurrency <= 4) {
    return isNarrowViewport() || isCoarsePointer();
  }
  return false;
}

/** Pick rendering tier for the futuristic canvas. */
export function resolveVisualTier(force?: VisualTier): VisualTier {
  if (force) return force;
  if (typeof window === "undefined") return "lite";
  if (prefersReducedMotion()) return "off";
  if (isLowEndDevice() || (isNarrowViewport() && isCoarsePointer())) return "lite";
  return "full";
}

export function backgroundIntensityForPath(pathname: string | null): "off" | "subtle" | "rich" {
  if (!pathname) return "subtle";
  if (pathname === "/") return "off"; // landing has its own Hyperspeed
  if (pathname.startsWith("/chat")) return "rich";
  if (pathname.startsWith("/products")) return "rich";
  if (pathname.startsWith("/use/") || pathname.startsWith("/home")) return "subtle";
  return "subtle";
}
