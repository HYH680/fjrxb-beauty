import { DarkShell } from "@/components/DarkShell";

export default function ChatLayout({
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
