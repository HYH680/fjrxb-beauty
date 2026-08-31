"use client";

/**
 * Site logo mark — geometric M on black square.
 */
export function BrandMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo.png"
      alt=""
      width={64}
      height={64}
      className={`shrink-0 rounded-md bg-black object-contain ${className}`}
      aria-hidden
      decoding="async"
    />
  );
}
