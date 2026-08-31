"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
} from "react";
import { prefersReducedMotion } from "@/lib/visual-capability";

type Props = {
  children: ReactNode;
  className?: string;
  /** Multiplier for pointer parallax (0–1). */
  strength?: number;
};

/**
 * Lightweight CSS parallax shell for chat content layers.
 * Pointer moves near/far layers in opposite directions for depth.
 */
export function ParallaxDepth({ children, className = "", strength = 0.55 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [style, setStyle] = useState<CSSProperties>({});

  useEffect(() => {
    setEnabled(!prefersReducedMotion());
  }, []);

  const onMove = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (!enabled) return;
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      const near = strength * 10;
      const far = strength * 4;
      setStyle({
        ["--fx-near-x" as string]: `${(-nx * near).toFixed(2)}px`,
        ["--fx-near-y" as string]: `${(-ny * near * 0.65).toFixed(2)}px`,
        ["--fx-far-x" as string]: `${(nx * far).toFixed(2)}px`,
        ["--fx-far-y" as string]: `${(ny * far * 0.65).toFixed(2)}px`,
      });
    },
    [enabled, strength]
  );

  const onLeave = useCallback(() => {
    setStyle({
      ["--fx-near-x" as string]: "0px",
      ["--fx-near-y" as string]: "0px",
      ["--fx-far-x" as string]: "0px",
      ["--fx-far-y" as string]: "0px",
    });
  }, []);

  return (
    <div
      ref={ref}
      className={`fx-parallax-shell relative ${className}`.trim()}
      style={style}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
    >
      {children}
    </div>
  );
}
