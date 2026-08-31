import { DarkShell } from "@/components/DarkShell";
import { BrandLogo } from "@/components/BrandLogo";
import { TechBackdrop } from "@/components/TechBackdrop";

/** 暖黑货架风输入框：与 /opened、目录页底色一致 */
export const AUTH_INPUT =
  "w-full rounded-lg border border-white/12 bg-[#161310] px-4 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 transition-[border-color,box-shadow] duration-200 focus:border-[#c4843c]/55 focus:shadow-[0_0_0_3px_rgba(196,132,60,0.12)]";

export const AUTH_BTN =
  "ui-press flex w-full items-center justify-center gap-2 rounded-lg bg-[#c4843c] py-2.5 text-sm font-medium text-[#1a1208] hover:bg-[#d4924a] disabled:opacity-50";

export const AUTH_LINK =
  "text-[#e0b07a] transition-colors hover:text-[#f0c896] hover:underline";

export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="landing-root relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#0f0d0b] px-4 py-16 text-zinc-100">
      <DarkShell />
      <TechBackdrop variant="landing" />
      <div className="relative z-10 w-full max-w-md">
        <BrandLogo href="/" className="mb-10" />
        <div className="rounded-2xl border border-white/10 bg-[#14110e]/85 p-6 shadow-[0_24px_64px_rgba(0,0,0,0.45)] backdrop-blur-sm sm:p-8">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">
            {title}
          </h1>
          <p className="mt-2 text-sm leading-6 text-zinc-500">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
