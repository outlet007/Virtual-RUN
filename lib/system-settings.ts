import { createClient } from "@/lib/supabase/server";

export type SystemSettings = {
  site_name: string;
  logo_url: string | null;
  favicon_url: string | null;
  color_ink: string;
  color_primary: string;
  color_accent: string;
  color_medal: string;
};

// ค่าเริ่มต้นตรงกับ default ในตาราง system_settings (0012_system_settings.sql)
// ใช้เป็น fallback ตอนยังไม่มีแถวตั้งค่า/ต่อ DB ไม่ได้ ไม่ให้ทั้งเว็บพังเพราะ settings หาย
export const DEFAULT_SETTINGS: SystemSettings = {
  site_name: "VirtualRun",
  logo_url: null,
  favicon_url: null,
  color_ink: "#2C3B98",
  color_primary: "#FEC81D",
  color_accent: "#FF4A00",
  color_medal: "#F5A524",
};

export async function getSystemSettings(): Promise<SystemSettings> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("system_settings")
    .select("site_name, logo_url, favicon_url, color_ink, color_primary, color_accent, color_medal")
    .eq("id", 1)
    .single();
  return data ?? DEFAULT_SETTINGS;
}
