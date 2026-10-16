import { requireAdmin } from "@/lib/auth/admin";

export default async function AdminEventsLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return children;
}
