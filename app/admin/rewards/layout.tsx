import { requireManager } from "@/lib/auth/admin";

export default async function AdminRewardsLayout({ children }: { children: React.ReactNode }) {
  await requireManager();
  return children;
}
