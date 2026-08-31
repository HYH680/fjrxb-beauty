import { DarkShell } from "@/components/DarkShell";

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
