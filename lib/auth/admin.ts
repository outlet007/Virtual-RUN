import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function getAdminUser() {
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

  if (profile?.role !== "admin") return null;
  return user;
}

// เรียกได้ทั้งจาก page (กัน render) และจาก server action (กัน call ตรงข้าม page)
export async function requireAdmin() {
  const user = await getAdminUser();
  if (!user) {
    redirect("/dashboard?error=" + encodeURIComponent("ต้องเป็นผู้ดูแลระบบ"));
  }
  return user;
}
