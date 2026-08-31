"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Minus, Plus, RotateCcw, X } from "lucide-react";

export function ImageLightbox({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt: string;
  onClose: () => void;
}) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "+" || event.key === "=") setScale((value) => Math.min(4, value + 0.25));
      if (event.key === "-" || event.key === "_") setScale((value) => Math.max(0.5, value - 0.25));
      if (event.key === "0") {
        setScale(1);
        setOffset({ x: 0, y: 0 });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const zoom = (next: number) => {
    const clamped = Math.min(4, Math.max(0.5, Math.round(next * 100) / 100));
    setScale(clamped);
    if (clamped <= 1) setOffset({ x: 0, y: 0 });
  };

  const overlay = (
    <div
      className="fixed inset-0 z-[80] flex flex-col bg-black/80"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="查看图片"
    >
      <div
        className="flex items-center justify-between px-4 py-3 text-sm text-zinc-200"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="truncate pr-4">{alt || "图片"}</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-lg border border-white/15 bg-white/5 p-2 hover:bg-white/10"
            onClick={() => zoom(scale - 0.25)}
            aria-label="缩小"
            title="缩小"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-12 text-center text-xs tabular-nums">{Math.round(scale * 100)}%</span>
          <button
            type="button"
            className="rounded-lg border border-white/15 bg-white/5 p-2 hover:bg-white/10"
            onClick={() => zoom(scale + 0.25)}
            aria-label="放大"
            title="放大"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="rounded-lg border border-white/15 bg-white/5 p-2 hover:bg-white/10"
            onClick={() => {
              setScale(1);
              setOffset({ x: 0, y: 0 });
            }}
            aria-label="还原"
            title="还原"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="rounded-lg border border-white/15 bg-white/5 p-2 hover:bg-white/10"
            onClick={onClose}
            aria-label="关闭"
            title="关闭"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div
        className="relative flex flex-1 items-center justify-center overflow-hidden"
        onWheel={(event) => {
          event.preventDefault();
          zoom(scale + (event.deltaY < 0 ? 0.15 : -0.15));
        }}
        onClick={(event) => event.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          draggable={false}
          className="max-h-[80vh] max-w-[90vw] select-none object-contain"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            cursor: scale > 1 ? (dragging ? "grabbing" : "grab") : "zoom-in",
          }}
          onDoubleClick={() => zoom(scale >= 2 ? 1 : scale + 0.5)}
          onMouseDown={(event) => {
            if (scale <= 1) return;
            setDragging({ x: event.clientX - offset.x, y: event.clientY - offset.y });
          }}
          onMouseMove={(event) => {
            if (!dragging) return;
            setOffset({
              x: event.clientX - dragging.x,
              y: event.clientY - dragging.y,
            });
          }}
          onMouseUp={() => setDragging(null)}
          onMouseLeave={() => setDragging(null)}
        />
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(overlay, document.body);
}
