import { requireSuperAdmin } from "@/lib/auth/admin";

export default async function AdminLegalLayout({ children }: { children: React.ReactNode }) {
  await requireSuperAdmin();
  return children;
}
