"use client";

import { useCallback, useRef, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * 服务卡玻璃外壳：1px 渐变描边 + 毛玻璃底 + 指针跟随光晕。
 * 内层 body 负责 backdrop-filter，外层只做描边与光效，避免滤镜叠加卡顿。
 */
export function ShelfGlowCard({
  children,
  className,
  accent = "#7c5cff",
}: {
  children: ReactNode;
  className?: string;
  accent?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const onMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--sgx", `${e.clientX - r.left}px`);
    el.style.setProperty("--sgy", `${e.clientY - r.top}px`);
  }, []);

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      className={cn("shelf-glass group/card relative h-full rounded-2xl p-px", className)}
      style={
        {
          "--shelf-accent": accent,
        } as CSSProperties
      }
    >
      {/* 指针跟随的彩色光晕（悬停才显形） */}
      <div className="shelf-glass__shine pointer-events-none absolute inset-0 z-10 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover/card:opacity-100" />

      <div className="shelf-glass__body relative z-20 h-full overflow-hidden rounded-[15px]">
        {/* 玻璃上沿折射高光 */}
        <div
          className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"
          aria-hidden
        />
        {children}
      </div>
    </div>
  );
}
