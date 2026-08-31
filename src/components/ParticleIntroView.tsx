"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";

const ParticleText = dynamic(
  () => import("@/components/react-bits/ParticleText"),
  { ssr: false }
);

type ParticleIntroViewProps = {
  exiting?: boolean;
  onGatherComplete?: () => void;
  onExitComplete?: () => void;
};

/**
 * Full-screen particle text intro shown before the marketing landing page.
 */
export function ParticleIntroView({
  exiting = false,
  onGatherComplete,
  onExitComplete,
}: ParticleIntroViewProps) {
  const shellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    if (!exiting) return;
    const shell = shellRef.current;
    if (!shell) return;

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      onExitComplete?.();
    };

    const handleEnd = (event: TransitionEvent) => {
      if (event.propertyName !== "opacity") return;
      finish();
    };

    shell.addEventListener("transitionend", handleEnd);
    const fallback = window.setTimeout(finish, 600);

    return () => {
      shell.removeEventListener("transitionend", handleEnd);
      window.clearTimeout(fallback);
    };
  }, [exiting, onExitComplete]);

  return (
    <div
      ref={shellRef}
      className={`particle-intro ${exiting ? "particle-intro--exit" : ""}`}
      aria-hidden={exiting}
    >
      <div className="particle-intro__backdrop" />
      <div className="particle-intro__content">
        <ParticleText
          className="particle-text--intro"
          text="Let AI Create Productivity"
          color="#f4f4f5"
          highlightColor="#7c5cff"
          fontSize="clamp(2.5rem, 11vw, 7rem)"
          fontWeight={800}
          scatter={110}
          gatherDuration={850}
          stagger={160}
          particleSize={2}
          density={4}
          pointerRepel={40}
          repelRadius={120}
          idleDrift={0.7}
          glow
          onGatherComplete={onGatherComplete}
        />
      </div>
    </div>
  );
}
