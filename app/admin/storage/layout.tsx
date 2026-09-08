import { requireSuperAdmin } from "@/lib/auth/admin";

export default async function AdminStorageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSuperAdmin();
  return children;
}
