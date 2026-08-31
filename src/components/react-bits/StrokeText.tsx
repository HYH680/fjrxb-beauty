"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { gsap } from "gsap";
import "./StrokeText.css";

const DEFAULT_TEXT = "Make AI Great";

type StrokeTextTrigger = "mount" | "hover" | "loop";
type StrokeTextFillMode = "wipe" | "fade" | "none";

export interface StrokeTextProps {
  text?: string;
  strokeColor?: string;
  fillColor?: string;
  strokeWidth?: number;
  drawDuration?: number;
  fillDelay?: number;
  stagger?: number;
  ease?: string;
  trigger?: StrokeTextTrigger;
  fillMode?: StrokeTextFillMode;
  fontSize?: number;
  fontWeight?: number | string;
  letterSpacing?: number;
  reverse?: boolean;
  className?: string;
  style?: CSSProperties;
  onComplete?: () => void;
}

type TextBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export default function StrokeText({
  text = DEFAULT_TEXT,
  strokeColor = "#A78BFA",
  fillColor = "#F8FAFC",
  strokeWidth = 1.4,
  drawDuration = 1.15,
  fillDelay = 0.08,
  stagger = 0.035,
  ease = "power2.out",
  trigger = "mount",
  fillMode = "wipe",
  fontSize = 128,
  fontWeight = 800,
  letterSpacing = -4,
  reverse = false,
  className = "",
  style,
  onComplete,
}: StrokeTextProps) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const strokeTextRef = useRef<SVGTextElement>(null);
  const wipeRectRef = useRef<SVGRectElement>(null);
  const onCompleteRef = useRef(onComplete);
  const [box, setBox] = useState<TextBox | null>(null);
  const rawId = useId();
  const wipeId = `stroke-text-wipe-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const characters = useMemo(() => Array.from(String(text ?? "")), [text]);
  const dash = Math.max(fontSize * 7, 200);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const fontStyle = useMemo<CSSProperties>(
    () => ({
      fontSize: `${fontSize}px`,
      fontWeight,
      letterSpacing: `${letterSpacing}px`,
    }),
    [fontSize, fontWeight, letterSpacing]
  );

  useLayoutEffect(() => {
    const node = strokeTextRef.current;
    if (!node) return;

    let cancelled = false;
    const measure = () => {
      if (cancelled || !strokeTextRef.current) return;
      let bbox: DOMRect;
      try {
        bbox = strokeTextRef.current.getBBox();
      } catch {
        return;
      }
      if (!bbox.width) return;

      const pad = Math.max(Number(strokeWidth) || 1, fontSize * 0.1);
      const next = {
        x: bbox.x - pad,
        y: bbox.y - pad,
        width: bbox.width + pad * 2,
        height: bbox.height + pad * 2,
      };
      setBox((previous) =>
        previous &&
        Math.abs(previous.x - next.x) < 0.5 &&
        Math.abs(previous.width - next.width) < 0.5 &&
        Math.abs(previous.y - next.y) < 0.5
          ? previous
          : next
      );
    };

    measure();
    void document.fonts?.ready.then(measure).catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [characters, fontSize, fontWeight, letterSpacing, strokeWidth]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !box) return;

    const context = gsap.context(() => {
      const strokes = gsap.utils.toArray<SVGElement>("[data-stroke-char]");
      const fills = gsap.utils.toArray<SVGElement>("[data-fill-char]");
      const wipe = wipeRectRef.current;
      const fillEnabled = fillMode !== "none";
      const useWipe = fillEnabled && fillMode === "wipe";
      const fillDuration = Math.max(0.3, drawDuration * 0.4);
      const staggerConfig = reverse
        ? { each: stagger, from: "end" as const }
        : stagger;
      const targets = [...strokes, ...fills, wipe].filter(Boolean);

      const setStart = () => {
        gsap.killTweensOf(targets);
        gsap.set(strokes, { strokeDasharray: dash, strokeDashoffset: dash });
        gsap.set(fills, { opacity: useWipe ? 1 : 0 });
        if (wipe) gsap.set(wipe, { attr: { width: 0 } });
      };

      const setEnd = () => {
        gsap.killTweensOf(targets);
        gsap.set(strokes, { strokeDasharray: dash, strokeDashoffset: 0 });
        gsap.set(fills, { opacity: fillEnabled ? 1 : 0 });
        if (wipe) {
          gsap.set(wipe, { attr: { width: fillEnabled ? box.width : 0 } });
        }
      };

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setEnd();
        onCompleteRef.current?.();
        return;
      }

      const build = () => {
        setStart();
        const timeline = gsap.timeline({
          paused: true,
          repeat: trigger === "loop" ? -1 : 0,
          repeatDelay: trigger === "loop" ? 0.7 : 0,
          defaults: { overwrite: "auto" },
          onComplete:
            trigger === "loop" ? undefined : () => onCompleteRef.current?.(),
        });

        timeline.to(
          strokes,
          {
            strokeDashoffset: 0,
            duration: drawDuration,
            ease,
            stagger: staggerConfig,
          },
          0
        );

        if (useWipe && wipe) {
          timeline.to(
            wipe,
            {
              attr: { width: box.width },
              duration: fillDuration,
              ease: "power2.inOut",
            },
            drawDuration + fillDelay
          );
        } else if (fillEnabled) {
          timeline.to(
            fills,
            {
              opacity: 1,
              duration: fillDuration,
              ease: "power2.out",
              stagger: staggerConfig,
            },
            drawDuration + fillDelay
          );
        }
        return timeline;
      };

      if (trigger === "hover") {
        setEnd();
        let timeline: gsap.core.Timeline | null = null;
        const play = () => {
          timeline?.kill();
          timeline = build();
          timeline.play(0);
        };
        root.addEventListener("pointerenter", play);
        return () => {
          root.removeEventListener("pointerenter", play);
          timeline?.kill();
        };
      }

      const timeline = build();
      timeline.play(0);
      return () => timeline.kill();
    }, root);

    return () => context.revert();
  }, [
    box,
    dash,
    drawDuration,
    fillDelay,
    stagger,
    ease,
    trigger,
    fillMode,
    reverse,
  ]);

  const viewBox = box
    ? `${box.x} ${box.y} ${box.width} ${box.height}`
    : `0 ${-fontSize} 900 ${fontSize * 1.3}`;

  return (
    <span
      ref={rootRef}
      className={`stroke-text ${trigger === "hover" ? "stroke-text--hover" : ""} ${box ? "stroke-text--measured" : ""} ${className}`.trim()}
      style={
        {
          ...style,
          "--stroke-text-height": `${Math.round(fontSize * 1.3)}px`,
          "--stroke-text-dash": dash,
        } as CSSProperties
      }
      role="img"
      aria-label={String(text ?? "")}
    >
      <svg
        className="stroke-text__svg"
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
      >
        {fillMode === "wipe" && box ? (
          <defs>
            <clipPath id={wipeId} clipPathUnits="userSpaceOnUse">
              <rect
                ref={wipeRectRef}
                x={box.x}
                y={box.y}
                width="0"
                height={box.height}
              />
            </clipPath>
          </defs>
        ) : null}

        <text
          ref={strokeTextRef}
          className="stroke-text__stroke"
          x="0"
          y="0"
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
          strokeLinecap="round"
          style={fontStyle}
        >
          {characters.map((char, index) => (
            <tspan data-stroke-char key={`s-${index}`}>
              {char}
            </tspan>
          ))}
        </text>

        <text
          className="stroke-text__fill"
          x="0"
          y="0"
          fill={fillColor}
          stroke="none"
          style={fontStyle}
          clipPath={
            fillMode === "wipe" && box ? `url(#${wipeId})` : undefined
          }
        >
          {characters.map((char, index) => (
            <tspan data-fill-char key={`f-${index}`}>
              {char}
            </tspan>
          ))}
        </text>
      </svg>
    </span>
  );
}
