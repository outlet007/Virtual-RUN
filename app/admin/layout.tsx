import Link from "next/link";
import { ADMIN_ROLE_LABELS, requireAdmin } from "@/lib/auth/admin";

const operationalTabs = [
  { href: "/admin/registrations", label: "ผู้สมัคร" },
  { href: "/admin/submissions", label: "ตรวจผลวิ่ง" },
  { href: "/admin/payments", label: "การชำระเงิน" },
  { href: "/admin/shipments", label: "จัดส่งเหรียญ" },
];

const managerTabs = [
  { href: "/admin/events", label: "งาน" },
  { href: "/admin/rewards", label: "รางวัล" },
  { href: "/admin/levels", label: "Level" },
];

const superAdminTabs = [
  { href: "/admin", label: "ภาพรวม" },
  ...operationalTabs,
  ...managerTabs,
  { href: "/admin/admins", label: "ผู้ดูแลระบบ" },
  { href: "/admin/hero-banners", label: "Banner หน้าแรก" },
  { href: "/admin/settings", label: "ตั้งค่าระบบ" },
];

const adminTabs = [
  { href: "/admin/events", label: "งานและเหรียญ" },
  { href: "/admin/hero-banners", label: "Banner หน้าแรก" },
  { href: "/admin/rewards", label: "รางวัล" },
  { href: "/admin/levels", label: "Level" },
  ...operationalTabs,
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { role } = await requireAdmin();
  const tabs =
    role === "super_admin"
      ? superAdminTabs
      : role === "admin"
        ? adminTabs
        : operationalTabs;

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary-dark">
          Admin
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl font-bold">แผงควบคุม</h1>
          <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary-dark">
            {ADMIN_ROLE_LABELS[role]}
          </span>
        </div>
      </div>
      <nav className="flex max-w-full gap-1 overflow-x-auto border-b border-lane pb-2 text-sm">
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="shrink-0 whitespace-nowrap rounded-lg px-3 py-2 font-medium hover:bg-lane/60"
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
