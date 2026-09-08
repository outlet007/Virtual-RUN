import { requireSuperAdmin } from "@/lib/auth/admin";

export default async function AdminIntegrationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSuperAdmin();
  return children;
}
