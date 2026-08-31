"use client";

import dynamic from "next/dynamic";

/**
 * Full-bleed React Bits Hyperspeed (three + postprocessing).
 * CSS fallback shows until the client chunk hydrates.
 */
const Hyperspeed = dynamic(() => import("@/components/react-bits/Hyperspeed"), {
  ssr: false,
  loading: () => <HyperspeedFallback />,
});

/** Stable options — Hyperspeed re-inits when effectOptions identity changes. */
const HYPERSPEED_OPTIONS = {
  onSpeedUp: () => {},
  onSlowDown: () => {},
  distortion: "turbulentDistortion" as const,
  length: 400,
  roadWidth: 10,
  islandWidth: 2,
  lanesPerRoad: 4,
  fov: 90,
  fovSpeedUp: 150,
  speedUp: 2,
  carLightsFade: 0.4,
  totalSideLightSticks: 20,
  lightPairsPerRoadWay: 40,
  shoulderLinesWidthPercentage: 0.05,
  brokenLinesWidthPercentage: 0.1,
  brokenLinesLengthPercentage: 0.5,
  lightStickWidth: [0.12, 0.5] as [number, number],
  lightStickHeight: [1.3, 1.7] as [number, number],
  movingAwaySpeed: [60, 80] as [number, number],
  movingCloserSpeed: [-120, -160] as [number, number],
  carLightsLength: [400 * 0.03, 400 * 0.2] as [number, number],
  carLightsRadius: [0.05, 0.14] as [number, number],
  carWidthPercentage: [0.3, 0.5] as [number, number],
  carShiftX: [-0.8, 0.8] as [number, number],
  carFloorSeparation: [0, 5] as [number, number],
  colors: {
    roadColor: 0x080808,
    islandColor: 0x0a0a0a,
    background: 0x000000,
    shoulderLines: 0xffffff,
    brokenLines: 0xffffff,
    leftCars: [0xd856bf, 0x6750a2, 0xc247ac],
    rightCars: [0x03b3c3, 0x0e5ea5, 0x324555],
    sticks: 0x03b3c3,
  },
};

function HyperspeedFallback() {
  return (
    <div className="absolute inset-0" aria-hidden>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_20%,#1a1030_0%,#050508_55%,#000_100%)]" />
      <div className="absolute inset-0 opacity-[0.35] [background-image:repeating-linear-gradient(105deg,transparent,transparent_12px,rgba(124,92,255,0.06)_12px,rgba(124,92,255,0.06)_13px)]" />
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black to-transparent" />
    </div>
  );
}

export function LandingHyperspeed() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-black" />
      <div className="absolute inset-0 [&_#lights]:pointer-events-auto">
        <Hyperspeed effectOptions={HYPERSPEED_OPTIONS} />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/50 via-black/20 to-black/65" />
    </div>
  );
}
