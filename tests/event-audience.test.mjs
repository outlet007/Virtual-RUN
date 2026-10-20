import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  emailMatchesEventAudience,
  getEventAudienceDomains,
  getEventAudienceEligibility,
  parseEventAudience,
} from "../lib/event-audience.ts";

test("audience parser defaults unknown values to everyone", () => {
  assert.equal(parseEventAudience("staff"), "staff");
  assert.equal(parseEventAudience("staff_student"), "staff_student");
  assert.equal(parseEventAudience(undefined), "all");
  assert.equal(parseEventAudience("admin"), "all");
});

test("email domain rules match the database function", () => {
  assert.equal(emailMatchesEventAudience("someone@gmail.com", "all"), true);
  assert.equal(emailMatchesEventAudience(null, "all"), true);
  assert.equal(emailMatchesEventAudience(" Staff@BU.AC.TH ", "staff"), true);
  assert.equal(emailMatchesEventAudience("x@fakebu.ac.th", "staff"), false);
  assert.equal(emailMatchesEventAudience("x@bu.ac.th.evil.com", "staff"), false);
  assert.equal(emailMatchesEventAudience("s@bumail.net", "staff"), false);
  assert.equal(emailMatchesEventAudience("s@bumail.net", "student"), true);
  assert.equal(emailMatchesEventAudience("t@bu.ac.th", "student"), false);
  assert.equal(emailMatchesEventAudience("t@bu.ac.th", "staff_student"), true);
  assert.equal(emailMatchesEventAudience("s@bumail.net", "staff_student"), true);
  assert.equal(emailMatchesEventAudience("x@gmail.com", "staff_student"), false);
  assert.equal(emailMatchesEventAudience(undefined, "staff"), false);
  assert.deepEqual(getEventAudienceDomains("staff_student"), ["@bu.ac.th", "@bumail.net"]);
});

test("restricted audiences trust only a linked Google identity", () => {
  const google = (email) => ({ provider: "google", identity_data: { email } });
  const password = (email) => ({ provider: "email", identity_data: { email } });

  assert.equal(getEventAudienceEligibility(null, "all"), "eligible");
  assert.equal(
    getEventAudienceEligibility({ email: "a@gmail.com", identities: [password("a@gmail.com")] }, "all"),
    "eligible",
  );
  assert.equal(
    getEventAudienceEligibility({ email: "t@bu.ac.th", identities: [google("t@bu.ac.th")] }, "staff"),
    "eligible",
  );
  assert.equal(
    getEventAudienceEligibility({ email: "t@bu.ac.th", identities: [password("t@bu.ac.th")] }, "staff"),
    "google_required",
  );
  assert.equal(
    getEventAudienceEligibility(
      { email: "t@bu.ac.th", identities: [password("t@bu.ac.th"), google("t@bu.ac.th")] },
      "staff_student",
    ),
    "eligible",
  );
  assert.equal(
    getEventAudienceEligibility({ email: "s@bumail.net", identities: [google("s@bumail.net")] }, "staff"),
    "not_eligible",
  );
  assert.equal(
    getEventAudienceEligibility({ email: "a@gmail.com", identities: [google("a@gmail.com")] }, "student"),
    "not_eligible",
  );
  assert.equal(getEventAudienceEligibility(null, "staff"), "not_eligible");
});

test("migration enforces audience in register_for_event using Google identities", async () => {
  const sql = await readFile("supabase/migrations/20261019021022_add_event_audience.sql", "utf8");

  assert.match(sql, /add column audience text not null default 'all'/);
  assert.match(sql, /audience in \('all', 'staff', 'student', 'staff_student'\)/);
  assert.match(sql, /from auth\.identities i/);
  assert.match(sql, /and i\.provider = 'google'/);
  assert.match(sql, /email_matches_event_audience\(i\.identity_data->>'email', v_event\.audience\)/);
  assert.doesNotMatch(sql, /from public\.users/);
  assert.match(sql, /message = 'event_audience_not_allowed'/);
  assert.match(sql, /revoke all on function public\.register_for_event\(uuid, jsonb\) from public, anon/);
  assert.match(sql, /grant execute on function public\.register_for_event\(uuid, jsonb\) to authenticated/);
});

test("admin forms, event pages and registration guard expose the audience", async () => {
  const [newPage, createModal, audienceField, editModal, actions, eventPage, registerPage, home, errors] = await Promise.all([
    readFile("app/admin/events/new/page.tsx", "utf8"),
    readFile("components/admin/create-event-modal.tsx", "utf8"),
    readFile("components/admin/event-audience-field.tsx", "utf8"),
    readFile("components/admin/edit-event-modal.tsx", "utf8"),
    readFile("lib/actions/admin.ts", "utf8"),
    readFile("app/events/[id]/page.tsx", "utf8"),
    readFile("app/events/[id]/register/page.tsx", "utf8"),
    readFile("app/page.tsx", "utf8"),
    readFile("lib/registration-errors.ts", "utf8"),
  ]);

  // ทุกฟอร์มสร้าง/แก้ไขงานต้องมีช่องกลุ่มผู้สมัคร รวมถึง modal ที่ใช้จริงในหน้า /admin/events
  assert.match(audienceField, /<Select name="audience" defaultValue=\{defaultValue\}>/);
  assert.match(newPage, /<EventAudienceField defaultValue="all" \/>/);
  assert.match(createModal, /<EventAudienceField defaultValue="all" \/>/);
  assert.match(editModal, /<EventAudienceField defaultValue=\{event\.audience\} \/>/);
  assert.equal(actions.match(/parseEventAudience\(formData\.get\("audience"\)\)/g)?.length, 2);
  assert.match(eventPage, /getEventAudienceEligibility\(user, audience\)/);
  assert.match(eventPage, /งานนี้เปิดรับเฉพาะ\$\{eventAudienceLabel\[audience\]\.th\} ที่ลงทะเบียนด้วยอีเมล \(/);
  assert.match(eventPage, /audienceEligibility === "google_required"/);
  assert.match(eventPage, /user && !userMatchesAudience \?/);
  // ข้อความแจ้งกลุ่มผู้สมัครที่สมัครได้ใช้ตัวอักษรสี #FF4A00
  assert.match(eventPage, /bg-medal-soft px-3 py-2 text-sm text-\[#FF4A00\]`\}\s*>\s*\{audienceNotice\}/);
  assert.match(registerPage, /getEventAudienceEligibility\(user, parseEventAudience\(eventData\.audience\)\)/);
  assert.match(home, /const audience = parseEventAudience\(ev\.audience\);/);
  assert.match(home, /\{audience !== "all" && \(/);
  // ป้ายกลุ่มผู้สมัคร: สีพื้นตามกลุ่มจากตารางกลาง ตัวอักษรสีขาว ทั้งการ์ดหน้าแรกและหน้ารายละเอียดงาน
  for (const source of [home, eventPage]) {
    assert.match(source, /<Badge className=\{`[^`]*\$\{eventAudienceBadgeClass\[audience\]\} text-sm text-white[^`]*`\}>\s*\{tx\(locale, "เฉพาะ", "For "\)\}/);
  }
  assert.match(errors, /event_audience_not_allowed/);
});

test("admin event list filters by audience and the field is labelled สำหรับ", async () => {
  const [list, field] = await Promise.all([
    readFile("app/admin/events/page.tsx", "utf8"),
    readFile("components/admin/event-audience-field.tsx", "utf8"),
  ]);

  assert.match(field, /<Label>สำหรับ<\/Label>/);
  assert.match(list, /<label[^>]*>สำหรับ<\/label>\s*<Select name="audience" defaultValue=\{audienceFilter\}>/);
  // รับเฉพาะค่าที่รู้จัก แล้วกรองด้วยคอลัมน์ audience และคงค่าไว้ตอนเปลี่ยนหน้า
  assert.match(list, /EVENT_AUDIENCES\.includes\(sp\.audience as EventAudience\)/);
  assert.match(list, /if \(audienceFilter\) query = query\.eq\("audience", audienceFilter\);/);
  assert.match(list, /if \(audienceFilter\) params\.set\("audience", audienceFilter\);/);
  // การ์ดงานใน Admin แสดงป้ายกลุ่มผู้สมัครแบบเดียวกับหน้าแรก
  assert.match(list, /audience, start_date/);
  assert.match(list, /audience !== "all" && \(\s*<Badge className=\{`absolute left-3 top-3 \$\{eventAudienceBadgeClass\[audience\]\} text-sm text-white shadow-sm`\}>/);
});

test("audience badge colors differ per group and live where Tailwind scans", async () => {
  const [colors, tailwind] = await Promise.all([
    readFile("components/events/event-audience-badge.ts", "utf8"),
    readFile("tailwind.config.ts", "utf8"),
  ]);
  assert.match(colors, /staff: "bg-\[#FF4A00\]"/);
  assert.match(colors, /student: "bg-\[rgb\(0,112,230\)\]"/);
  assert.match(colors, /staff_student: "bg-\[rgb\(141,37,255\)\]"/);
  assert.match(tailwind, /"\.\/components\/\*\*\/\*\.\{ts,tsx\}"/);
});
