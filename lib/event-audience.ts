// กลุ่มผู้สมัครของงานวิ่ง ตรวจจากโดเมน email ที่ใช้เข้าระบบ
// การตัดสินจริงอยู่ใน register_for_event (public.email_matches_event_audience + auth.identities)
// ฟังก์ชันฝั่งนี้ใช้แสดงผลและซ่อนปุ่มเท่านั้น และต้องตรงกับกฎใน migration 20261019021022

export const EVENT_AUDIENCES = ["all", "staff", "student", "staff_student"] as const;

export type EventAudience = (typeof EVENT_AUDIENCES)[number];

export const STAFF_EMAIL_DOMAIN = "@bu.ac.th";
export const STUDENT_EMAIL_DOMAIN = "@bumail.net";

export const eventAudienceLabel: Record<EventAudience, { th: string; en: string }> = {
  all: { th: "ทุกคน (บุคคลทั่วไป)", en: "Everyone" },
  staff: { th: "บุคลากร", en: "Staff" },
  student: { th: "นักศึกษา", en: "Students" },
  staff_student: { th: "บุคลากรและนักศึกษา", en: "Staff and students" },
};

const allowedDomains: Record<EventAudience, string[]> = {
  all: [],
  staff: [STAFF_EMAIL_DOMAIN],
  student: [STUDENT_EMAIL_DOMAIN],
  staff_student: [STAFF_EMAIL_DOMAIN, STUDENT_EMAIL_DOMAIN],
};

export function parseEventAudience(value: unknown): EventAudience {
  return EVENT_AUDIENCES.includes(value as EventAudience) ? (value as EventAudience) : "all";
}

export function getEventAudienceDomains(audience: EventAudience): string[] {
  return allowedDomains[audience];
}

export function emailMatchesEventAudience(
  email: string | null | undefined,
  audience: EventAudience,
): boolean {
  if (audience === "all") return true;
  const normalized = String(email ?? "").trim().toLowerCase();
  return allowedDomains[audience].some((domain) => normalized.endsWith(domain));
}

type IdentityLike = {
  provider?: string | null;
  identity_data?: Record<string, unknown> | null;
};

type UserLike = {
  email?: string | null;
  identities?: IdentityLike[] | null;
};

export type EventAudienceEligibility = "eligible" | "google_required" | "not_eligible";

// งานที่จำกัดกลุ่มเชื่อเฉพาะอีเมลจากบัญชี Google ที่ผูกไว้ (ทั้งสองโดเมนเป็น Google Workspace)
// เพราะการสมัครสมาชิกด้วยอีเมล/รหัสผ่านไม่ได้ยืนยันว่าเป็นเจ้าของอีเมลจริง
export function getEventAudienceEligibility(
  user: UserLike | null | undefined,
  audience: EventAudience,
): EventAudienceEligibility {
  if (audience === "all") return "eligible";
  const identities = user?.identities ?? [];
  const googleEmails = identities
    .filter((identity) => identity.provider === "google")
    .map((identity) => String(identity.identity_data?.email ?? ""));
  if (googleEmails.some((email) => emailMatchesEventAudience(email, audience))) {
    return "eligible";
  }
  const otherEmails = [
    user?.email,
    ...identities.map((identity) => String(identity.identity_data?.email ?? "")),
  ];
  return otherEmails.some((email) => emailMatchesEventAudience(email, audience))
    ? "google_required"
    : "not_eligible";
}
