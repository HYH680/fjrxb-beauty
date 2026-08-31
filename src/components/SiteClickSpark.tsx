"use client";

import { cn } from "@/lib/utils";
import ClickSpark from "@/components/react-bits/ClickSpark";

/** Site-wide click sparks (ReactBits). */
export function SiteClickSpark({
  children,
  className,
  sparkColor = "#2dd4bf",
  sparkSize = 9,
  sparkRadius = 18,
  sparkCount = 10,
  duration = 420,
}: {
  children: React.ReactNode;
  className?: string;
  sparkColor?: string;
  sparkSize?: number;
  sparkRadius?: number;
  sparkCount?: number;
  duration?: number;
}) {
  return (
    <ClickSpark
      sparkColor={sparkColor}
      sparkSize={sparkSize}
      sparkRadius={sparkRadius}
      sparkCount={sparkCount}
      duration={duration}
      extraScale={1.05}
    >
      <div className={cn("relative min-h-full w-full", className)}>{children}</div>
    </ClickSpark>
  );
}
