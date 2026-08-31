import type { Metadata } from "next";
import { Suspense } from "react";
import { GridScan } from "@/components/GridScan";
import { Header } from "@/components/Header";
import { ChatOpeningFallback } from "@/components/ChatFallbacks";
import { ChatPageClient } from "./ui";

export const metadata: Metadata = {
  title: "导购",
  description: "先说你在做什么，导购按场景匹配可开通的 AI 服务。未登录也可以先问。",
};

export default function ChatPage() {
  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-black text-zinc-100">
      <GridScan />
      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <Header />
        <Suspense fallback={<ChatOpeningFallback />}>
          <ChatPageClient />
        </Suspense>
      </div>
    </div>
  );
}
