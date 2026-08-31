import { RequireProfile } from "@/components/RequireProfile";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RequireProfile>{children}</RequireProfile>;
}
