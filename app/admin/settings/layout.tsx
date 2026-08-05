import { requireSuperAdmin } from "@/lib/auth/admin";

export default async function AdminSettingsLayout({ children }: { children: React.ReactNode }) {
  await requireSuperAdmin();
  return children;
}
