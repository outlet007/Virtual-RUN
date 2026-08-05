import { requireManager } from "@/lib/auth/admin";

export default async function AdminEventsLayout({ children }: { children: React.ReactNode }) {
  await requireManager();
  return children;
}
