import { requireManager } from "@/lib/auth/admin";

export default async function AdminHeroBannersLayout({ children }: { children: React.ReactNode }) {
  await requireManager();
  return children;
}
