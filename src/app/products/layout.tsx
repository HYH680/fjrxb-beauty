import type { Metadata } from "next";
import { DarkShell } from "@/components/DarkShell";

export const metadata: Metadata = {
  title: "服务目录",
  description: "同一份目录按需求切换视图：先发现和比较，再确认在线能力，最后按场景开通服务。",
};

export default function PublicShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <DarkShell />
      {children}
    </>
  );
}
