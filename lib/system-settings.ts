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
  site_name_en: string | null;
  logo_url: string | null;
  header_show_site_name: boolean;
  favicon_url: string | null;
  color_ink: string;
  color_primary: string;
  color_accent: string;
  color_medal: string;
  cookie_consent_enabled: boolean;
  cookie_consent_message: string;
  cookie_consent_message_en: string | null;
  cookie_policy_url: string;
  cookie_consent_button_label: string;
  cookie_consent_button_label_en: string | null;
  privacy_policy_text: string;
  privacy_policy_text_en: string;
  home_hero_kicker: string;
  home_hero_kicker_en: string;
  home_hero_title: string;
  home_hero_title_en: string;
  home_hero_highlight: string;
  home_hero_highlight_en: string;
  home_hero_suffix: string;
  home_hero_suffix_en: string;
  home_hero_description: string;
  home_hero_description_en: string;
  content_background_url: string | null;
  content_background_position_x: number;
  content_background_position_y: number;
  content_background_display: ContentBackgroundDisplay;
  content_background_inset_top: number;
  content_background_inset_bottom: number;
  content_overlay_color: string;
  content_overlay_opacity: number;
  submission_max_distance_km: number;
  submission_daily_limit: number;
};

// ค่าเริ่มต้นตรงกับ default ในตาราง system_settings (0012_system_settings.sql)
// ใช้เป็น fallback ตอนยังไม่มีแถวตั้งค่า/ต่อ DB ไม่ได้ ไม่ให้ทั้งเว็บพังเพราะ settings หาย
export const DEFAULT_SETTINGS: SystemSettings = {
  site_name: "VirtualRun",
  site_name_en: null,
  logo_url: null,
  header_show_site_name: true,
  favicon_url: null,
  color_ink: "#2C3B98",
  color_primary: "#FEC81D",
  color_accent: "#FF4A00",
  color_medal: "#F5A524",
  cookie_consent_enabled: true,
  cookie_consent_message:
    "เราใช้ cookies บนเว็บไซต์นี้เพื่อการบริหารเว็บไซต์ และเพิ่มประสิทธิภาพการใช้งานของท่าน สามารถตรวจสอบหรือดูนโยบายของ cookies ได้",
  cookie_consent_message_en:
    "We use cookies to operate this website and improve your experience. You can review our cookie policy for more information.",
  cookie_policy_url: "",
  cookie_consent_button_label: "ยอมรับ",
  cookie_consent_button_label_en: "Accept",
  privacy_policy_text:
    "เราให้ความสำคัญกับความเป็นส่วนตัวของคุณ ข้อมูลที่ให้ไว้ระหว่างการสมัครสมาชิกจะถูกใช้เพื่อสร้างและดูแลบัญชี บันทึกการเข้าร่วมกิจกรรม ประมวลผลผลวิ่ง และให้บริการที่เกี่ยวข้อง\n\nเราจะจัดเก็บข้อมูลเท่าที่จำเป็น ใช้มาตรการรักษาความปลอดภัยที่เหมาะสม และไม่เปิดเผยข้อมูลแก่บุคคลภายนอก เว้นแต่จำเป็นต่อการให้บริการ ตามกฎหมาย หรือได้รับความยินยอมจากคุณ\n\nคุณสามารถติดต่อผู้ดูแลระบบเพื่อขอเข้าถึง แก้ไข หรือลบข้อมูลส่วนบุคคลของคุณได้",
  privacy_policy_text_en:
    "We value your privacy. Information provided during registration is used to create and maintain your account, record event participation, process activity results, and provide related services.\n\nWe retain only the information necessary for these purposes, apply appropriate security measures, and do not disclose it to third parties unless required to provide the service, comply with the law, or with your consent.\n\nYou may contact the administrator to request access to, correction of, or deletion of your personal information.",
  home_hero_kicker: "Run · Walk · Collect",
  home_hero_kicker_en: "Run · Walk · Collect",
  home_hero_title: "วิ่งที่ไหน เมื่อไหร่ก็ได้",
  home_hero_title_en: "Run Anywhere, Anytime",
  home_hero_highlight: "เก็บทุกกิโลเมตร",
  home_hero_highlight_en: "Turn Every Kilometer",
  home_hero_suffix: "ให้เป็นเหรียญ",
  home_hero_suffix_en: "into a Medal",
  home_hero_description:
    "สมัครงาน เชื่อม Strava หรืออัปโหลดผลเอง ระบบรวมระยะให้อัตโนมัติ ครบเป้าเมื่อไหร่ ปลดล็อกเหรียญเมื่อนั้น",
  home_hero_description_en:
    "Join an event, connect Strava, or upload a result. We track your distance and unlock medals when you reach your goal.",
  content_background_url: null,
  content_background_position_x: 50,
  content_background_position_y: 50,
  content_background_display: "cover",
  content_background_inset_top: 0,
  content_background_inset_bottom: 0,
  content_overlay_color: "#FAFAF8",
  content_overlay_opacity: 0,
  submission_max_distance_km: 100,
  submission_daily_limit: 3,
};

export async function getSystemSettings(): Promise<SystemSettings> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("system_settings")
    .select(
      "site_name, site_name_en, logo_url, header_show_site_name, favicon_url, color_ink, color_primary, color_accent, color_medal, cookie_consent_enabled, cookie_consent_message, cookie_consent_message_en, cookie_policy_url, cookie_consent_button_label, cookie_consent_button_label_en, privacy_policy_text, privacy_policy_text_en, home_hero_kicker, home_hero_kicker_en, home_hero_title, home_hero_title_en, home_hero_highlight, home_hero_highlight_en, home_hero_suffix, home_hero_suffix_en, home_hero_description, home_hero_description_en, content_background_url, content_background_position_x, content_background_position_y, content_background_display, content_background_inset_top, content_background_inset_bottom, content_overlay_color, content_overlay_opacity, submission_max_distance_km, submission_daily_limit",
    )
    .eq("id", 1)
    .single();
  return data ?? DEFAULT_SETTINGS;
}
