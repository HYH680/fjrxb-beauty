"use client";

import { useEffect, useRef } from "react";
import StrokeText from "@/components/react-bits/StrokeText";

type StrokeIntroViewProps = {
  exiting?: boolean;
  onAnimationComplete?: () => void;
  onExitComplete?: () => void;
};

const criticalShellStyle = {
  position: "fixed",
  inset: 0,
  zIndex: 100,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#0f0d0b",
} as const;

export function StrokeIntroView({
  exiting = false,
  onAnimationComplete,
  onExitComplete,
}: StrokeIntroViewProps) {
  const shellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    if (!exiting) return;
    const shell = shellRef.current;
    if (!shell) return;

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      onExitComplete?.();
    };
    const handleEnd = (event: TransitionEvent) => {
      if (event.propertyName === "opacity") finish();
    };

    shell.addEventListener("transitionend", handleEnd);
    const fallback = window.setTimeout(finish, 500);
    return () => {
      shell.removeEventListener("transitionend", handleEnd);
      window.clearTimeout(fallback);
    };
  }, [exiting, onExitComplete]);

  return (
    <div
      ref={shellRef}
      className={`stroke-intro ${exiting ? "stroke-intro--exit" : ""}`}
      style={criticalShellStyle}
      aria-hidden={exiting}
    >
      <div className="stroke-intro__glow" aria-hidden="true" />
      <StrokeText
        className="stroke-intro__text"
        text="Make AI Great"
        strokeColor="#A78BFA"
        fillColor="#F8FAFC"
        strokeWidth={1.4}
        drawDuration={1.05}
        fillDelay={0.04}
        stagger={0.025}
        fontSize={128}
        fontWeight={800}
        letterSpacing={-4}
        onComplete={onAnimationComplete}
      />
    </div>
  );
}
