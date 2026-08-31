import { RequireProfile } from "@/components/RequireProfile";

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RequireProfile>{children}</RequireProfile>;
}
