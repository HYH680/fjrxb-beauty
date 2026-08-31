"use client";

import { useCallback, useEffect, useState } from "react";
import { LandingView } from "@/components/LandingView";
import { StrokeIntroView } from "@/components/StrokeIntroView";

/**
 * Root landing entry: server-rendered stroke intro on every visit/refresh,
 * then cross-fade to landing.
 */
export function LandingEntry() {
  const [introPhase, setIntroPhase] = useState<"playing" | "exiting" | "done">(
    "playing"
  );

  const handleAnimationComplete = useCallback(() => {
    setIntroPhase("exiting");
  }, []);

  const handleExitComplete = useCallback(() => {
    setIntroPhase("done");
  }, []);

  useEffect(() => {
    if (introPhase !== "playing") return;
    const fallback = window.setTimeout(() => setIntroPhase("exiting"), 3500);
    return () => window.clearTimeout(fallback);
  }, [introPhase]);

  return (
    <>
      {introPhase !== "done" ? (
        <StrokeIntroView
          exiting={introPhase === "exiting"}
          onAnimationComplete={handleAnimationComplete}
          onExitComplete={handleExitComplete}
        />
      ) : null}
      <LandingView />
    </>
  );
}
