import { RequireProfile } from "@/components/RequireProfile";

export default function UseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RequireProfile>{children}</RequireProfile>;
}
