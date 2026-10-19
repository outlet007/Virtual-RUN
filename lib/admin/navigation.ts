import type { AdminRole } from "@/lib/auth/admin";

// เมนูหลักของแผงควบคุม: รายการเดียว ชื่อเดียวกันทุกระดับ แล้วกรองตามสิทธิ์
// ลำดับในรายการ = ลำดับที่แสดง
export type AdminTab = {
  href: string;
  label: string;
  labelEn: string;
  roles: readonly AdminRole[];
};

const ALL: readonly AdminRole[] = ["super_admin", "admin", "staff"];
const MANAGERS: readonly AdminRole[] = ["super_admin", "admin"];
const SUPER_ADMIN: readonly AdminRole[] = ["super_admin"];

export const ADMIN_TABS: readonly AdminTab[] = [
  { href: "/admin", label: "ภาพรวม", labelEn: "Overview", roles: MANAGERS },
  { href: "/admin/registrations", label: "สมาชิก", labelEn: "Members", roles: MANAGERS },
  { href: "/admin/events", label: "งาน", labelEn: "Events", roles: ALL },
  { href: "/admin/articles", label: "บทความ", labelEn: "Articles", roles: MANAGERS },
  { href: "/admin/rewards", label: "รางวัล", labelEn: "Rewards", roles: MANAGERS },
  { href: "/admin/levels", label: "Level", labelEn: "Levels", roles: MANAGERS },
  { href: "/admin/hero-banners", label: "Banner หน้าแรก", labelEn: "Home Banners", roles: MANAGERS },
  { href: "/admin/admins", label: "ผู้ดูแลระบบ", labelEn: "Administrators", roles: SUPER_ADMIN },
  { href: "/admin/legal", label: "Privacy / Terms", labelEn: "Privacy / Terms", roles: SUPER_ADMIN },
  { href: "/admin/settings", label: "ตั้งค่าระบบ", labelEn: "Settings", roles: SUPER_ADMIN },
  { href: "/admin/integrations", label: "การเชื่อมต่อ", labelEn: "Integrations", roles: SUPER_ADMIN },
  { href: "/admin/storage", label: "พื้นที่หลักฐาน", labelEn: "Evidence Storage", roles: SUPER_ADMIN },
];

export function getAdminTabs(role: AdminRole): AdminTab[] {
  return ADMIN_TABS.filter((tab) => tab.roles.includes(role));
}
