import type { Metadata } from "next";
import "./globals.css";
import { ChatLauncher } from "@/components/ChatLauncher";
import { CartSync } from "@/components/CartSync";
import { AuthProvider } from "@/hooks/useAuth";
import { LocaleProvider } from "@/hooks/useLocale";
import { LocaleTree } from "@/components/LocaleTree";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { CommandPalette } from "@/components/CommandPalette";
import { SiteClickSpark } from "@/components/SiteClickSpark";
import { FuturisticBackground } from "@/components/FuturisticBackground";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://fjrxb.beauty"
  ),
  title: {
    default: "AI 智能体超市",
    template: "%s · AI 智能体超市",
  },
  description:
    "AI 智能体超市：把合适的智能体接到你正在做的事上。可先逛目录，导购匹配方案，按月申请开通接入与跟进。",
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand-mark.png", sizes: "64x64", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className={cn("dark h-full antialiased font-sans")} suppressHydrationWarning>
      <body className="relative min-h-full flex flex-col bg-background text-foreground" suppressHydrationWarning>
        <AuthProvider>
          <LocaleProvider>
            <LocaleTree>
              <TooltipProvider>
                <FuturisticBackground />
                <SiteClickSpark className="relative z-10 flex min-h-full flex-1 flex-col">
                  {children}
                </SiteClickSpark>
                <CartSync />
                <ChatLauncher />
                <CommandPalette />
                <Toaster theme="dark" />
              </TooltipProvider>
            </LocaleTree>
          </LocaleProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
