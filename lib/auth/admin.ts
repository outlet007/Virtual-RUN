import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const ADMIN_ROLES = ["super_admin", "admin", "staff"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: "ผู้ดูแลระบบสูงสุด",
  admin: "ผู้ดูแลระบบ",
  staff: "เจ้าหน้าที่",
};

export function isAdminRole(role: unknown): role is AdminRole {
  return typeof role === "string" && ADMIN_ROLES.includes(role as AdminRole);
}

export function getAdminHome(role: AdminRole) {
  if (role === "super_admin") return "/admin";
  if (role === "admin") return "/admin/events";
  return "/admin/submissions";
}

async function getAdminAccess() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!isAdminRole(profile?.role)) return null;
  return { user, role: profile.role };
}

export async function getAdminUser() {
  return (await getAdminAccess())?.user ?? null;
}

// เรียกได้ทั้งจาก page (กัน render) และจาก server action (กัน call ตรงข้าม page)
export async function requireAdmin() {
  const access = await getAdminAccess();
  if (!access) {
    redirect("/dashboard?error=" + encodeURIComponent("ต้องเป็นผู้ดูแลระบบหรือเจ้าหน้าที่"));
  }
  return access;
}

export async function requireManager() {
  const access = await requireAdmin();
  if (access.role === "staff") {
    redirect("/admin?error=" + encodeURIComponent("เจ้าหน้าที่ไม่มีสิทธิ์จัดการเนื้อหาส่วนนี้"));
  }
  return access;
}

export async function requireSuperAdmin() {
  const access = await requireAdmin();
  if (access.role !== "super_admin") {
    redirect("/admin?error=" + encodeURIComponent("เฉพาะผู้ดูแลระบบสูงสุดเท่านั้น"));
  }
  return access;
}
