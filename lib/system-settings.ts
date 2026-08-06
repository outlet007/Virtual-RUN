import { createClient } from "@/lib/supabase/server";

export const CONTENT_BACKGROUND_DISPLAYS = [
  "cover",
  "contain",
  "stretch",
  "auto",
  "repeat",
  "repeat-x",
  "repeat-y",
] as const;

export type ContentBackgroundDisplay = (typeof CONTENT_BACKGROUND_DISPLAYS)[number];

export type SystemSettings = {
  site_name: string;
  logo_url: string | null;
  favicon_url: string | null;
  color_ink: string;
  color_primary: string;
  color_accent: string;
  color_medal: string;
  cookie_consent_enabled: boolean;
  cookie_consent_message: string;
  cookie_policy_url: string;
  cookie_consent_button_label: string;
  content_background_url: string | null;
  content_background_position_x: number;
  content_background_position_y: number;
  content_background_display: ContentBackgroundDisplay;
  content_background_inset_top: number;
  content_background_inset_bottom: number;
  content_overlay_color: string;
  content_overlay_opacity: number;
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
  cookie_consent_enabled: true,
  cookie_consent_message:
    "เราใช้ cookies บนเว็บไซต์นี้เพื่อการบริหารเว็บไซต์ และเพิ่มประสิทธิภาพการใช้งานของท่าน สามารถตรวจสอบหรือดูนโยบายของ cookies ได้",
  cookie_policy_url: "",
  cookie_consent_button_label: "ยอมรับ",
  content_background_url: null,
  content_background_position_x: 50,
  content_background_position_y: 50,
  content_background_display: "cover",
  content_background_inset_top: 0,
  content_background_inset_bottom: 0,
  content_overlay_color: "#FAFAF8",
  content_overlay_opacity: 0,
};

export async function getSystemSettings(): Promise<SystemSettings> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("system_settings")
    .select(
      "site_name, logo_url, favicon_url, color_ink, color_primary, color_accent, color_medal, cookie_consent_enabled, cookie_consent_message, cookie_policy_url, cookie_consent_button_label, content_background_url, content_background_position_x, content_background_position_y, content_background_display, content_background_inset_top, content_background_inset_bottom, content_overlay_color, content_overlay_opacity",
    )
    .eq("id", 1)
    .single();
  return data ?? DEFAULT_SETTINGS;
}
