import { requireManager } from "@/lib/auth/admin";

export default async function AdminLevelsLayout({ children }: { children: React.ReactNode }) {
  await requireManager();
  return children;
}
