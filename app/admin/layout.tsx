import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";

const tabs = [
  { href: "/admin", label: "ภาพรวม" },
  { href: "/admin/events", label: "งาน" },
  { href: "/admin/submissions", label: "ตรวจผลวิ่ง" },
  { href: "/admin/shipments", label: "จัดส่งเหรียญ" },
  { href: "/admin/admins", label: "ผู้ดูแลระบบ" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary-dark">
          Admin
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold">แผงควบคุม</h1>
      </div>
      <nav className="flex flex-wrap gap-1 border-b border-lane pb-2 text-sm">
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="rounded-lg px-3 py-2 font-medium hover:bg-lane/60"
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
