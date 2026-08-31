"use client";

type Props = {
  src: string | null | undefined;
  alt: string;
  size?: number;
  className?: string;
};

/** Circular avatar for header / picker (preset SVG or uploaded image). */
export function UserAvatar({ src, alt, size = 32, className = "" }: Props) {
  const url = src?.trim() || "";
  if (!url) {
    return (
      <span
        className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10 ${className}`}
        style={{ width: size, height: size }}
        aria-hidden
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt}
      width={size}
      height={size}
      className={`shrink-0 rounded-full object-cover ring-1 ring-white/15 ${className}`}
      style={{ width: size, height: size }}
      decoding="async"
    />
  );
}
