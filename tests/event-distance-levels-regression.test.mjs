import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationPath =
  "supabase/migrations/20261014024232_add_event_distance_levels.sql";

test("migration creates secured event distance levels and idempotent achievements", async () => {
  const sql = await readFile(migrationPath, "utf8");

  assert.match(sql, /event_mode in \('single_target', 'distance_levels'\)/);
  assert.match(sql, /create table public\.event_distance_levels/);
  assert.match(sql, /create table public\.registration_distance_level_achievements/);
  assert.match(sql, /unique \(registration_id, level_id\)/);
  assert.match(sql, /registrations_one_active_distance_level_event_idx/);
  assert.match(sql, /sync_registration_distance_levels/);
  assert.match(sql, /on conflict \(registration_id, level_id\) do nothing/);
  assert.match(sql, /enable row level security/g);
  assert.match(sql, /grant select on table public\.event_distance_levels to anon, authenticated/);
  assert.match(sql, /grant execute on function public\.sync_registration_distance_levels\(uuid\) to service_role/);
  assert.doesNotMatch(
    sql,
    /grant execute on function public\.sync_registration_distance_levels\(uuid\) to (?:anon|authenticated)/,
  );
});

test("event applicant CSV export includes run status and management columns", async () => {
  const route = await readFile("app/admin/events/[id]/registrations/export/route.ts", "utf8");

  assert.match(route, /"สถานะการวิ่ง"/);
  assert.match(route, /"การจัดการ"/);
  assert.match(route, /registrationRunStatusLabel\[runProgress\.status\]/);
  assert.match(route, /getRegistrationRunProgress\(/);
  assert.match(route, /getEventDistanceLevelProgress\(/);
  assert.match(route, /\.eq\("status", "approved"\)/);
  assert.match(route, /isDistanceLevels \? \["ระดับปัจจุบัน", "ความคืบหน้าระดับ"\] : \[\]/);
});

test("home event cards show level distance range without package count", async () => {
  const home = await readFile("app/page.tsx", "utf8");

  assert.match(home, /event_distance_levels\(target_distance_km\)/);
  assert.match(home, /function getEventDistanceSummary/);
  assert.match(home, /packageCount: isDistanceLevels \? null : ev\.packages\.length/);
  assert.doesNotMatch(home, /Math\.min\(\.\.\.ev\.packages/);
  // thumbnail งานวิ่ง (เปิดรับสมัครและที่ผ่านมา) ใช้สัดส่วน 16:9 เท่ากับการ์ดบทความ
  assert.equal(home.match(/className="relative aspect-\[16\/9\] w-full overflow-hidden bg-lane"/g)?.length, 2);
  assert.doesNotMatch(home, /relative h-44 w-full/);
  // ขนาดตัวอักษรบนการ์ดหน้าแรก: ชื่อ 16px, บรรทัดวันที่/ระยะ 14px, คำอธิบาย 14px
  assert.equal(home.match(/<h3 className="[^"]*text-\[16px\][^"]*">/g)?.length, 3);
  assert.equal(home.match(/font-mono text-\[14px\] leading-5/g)?.length, 3);
  assert.equal(home.match(/line-clamp-2 text-\[14px\] leading-\[22px\] text-muted/g)?.length, 3);

  // การ์ดในหน้า Admin "งานทั้งหมด": รูป 16:9 เหมือนหน้าเว็บ แต่ตัวอักษรใช้ขนาดเดิมของ Admin
  const adminList = await readFile("app/admin/events/page.tsx", "utf8");
  assert.match(adminList, /relative aspect-\[16\/9\] w-full overflow-hidden bg-lane/);
  assert.match(adminList, /<h3 className="flex items-start gap-2 font-display font-bold">/);
  assert.match(adminList, /font-mono text-xs text-accent tnum/);
  assert.match(adminList, /line-clamp-2 text-sm text-muted/);
});

test("admin event tabs open on statistics first, before overview", async () => {
  const adminPage = await readFile("app/admin/events/[id]/page.tsx", "utf8");
  const managerTabs = adminPage.slice(adminPage.indexOf("defaultTab={defaultTab}"));
  const tabIds = [...managerTabs.matchAll(/^ {12}id: "([^"]+)",/gm)].map((match) => match[1]);

  assert.deepEqual(tabIds.slice(0, 2), ["statistics", "overview"]);
  assert.match(adminPage, /id: "overview",\s*label: "รายละเอียด",/);
});

test("free events hide payment, physical medal and shipment tabs", async () => {
  const [adminPage, medalFields, actions] = await Promise.all([
    readFile("app/admin/events/[id]/page.tsx", "utf8"),
    readFile("components/admin/package-medal-fields.tsx", "utf8"),
    readFile("lib/actions/admin.ts", "utf8"),
  ]);

  assert.match(adminPage, /const isPaidEvent = event\.pricing === "paid";/);
  assert.match(adminPage, /\.\.\.\(event\.pricing === "paid"\s*\? \[\{ label: "ยอดชำระเงินสะสม \(บาท\)"/);
  assert.match(adminPage, /\.\.\.\(isPaidEvent \? \[\{\s*id: "physical-medals"/);
  assert.match(adminPage, /\.\.\.\(isPaidEvent \? \[\s*\{\s*id: "payments"[\s\S]*?id: "shipments"/);
  assert.match(adminPage, /const staffEventIsPaid = staffEvent\.pricing === "paid";/);
  assert.match(adminPage, /\.\.\.\(staffEventIsPaid \? \[\s*\{\s*id: "payments"[\s\S]*?id: "shipments"/);
  assert.match(adminPage, /showPhysicalMedal=\{isPaidEvent\}/);
  assert.match(medalFields, /showPhysicalMedal && hasPhysicalMedal/);
  assert.match(actions, /if \(!\(await isPaidEvent\(db, eventId\)\)\) return null;/);
});

test("admin, public event and applicant views expose cumulative levels", async () => {
  const [adminPage, publicPage, adminActions, myEvents] = await Promise.all([
    readFile("app/admin/events/[id]/page.tsx", "utf8"),
    readFile("app/events/[id]/page.tsx", "utf8"),
    readFile("lib/actions/admin.ts", "utf8"),
    readFile("components/dashboard/my-events-tabs.tsx", "utf8"),
  ]);

  assert.match(adminPage, /id: "distance-levels"/);
  // distance_levels events register through one system-managed package, so admins
  // see only the levels tab (with registration settings) and never the packages tab.
  assert.match(adminPage, /\.\.\.\(!isDistanceLevels \? \[\{\s*id: "packages"/);
  assert.match(adminPage, /\.\.\.\(isDistanceLevels \? \[\{\s*id: "distance-levels"/);
  assert.match(adminPage, /defaultTab=\{defaultTab\}/);
  assert.match(adminPage, /action=\{updateDistanceLevelRegistration\}/);
  assert.match(adminActions, /async function ensureDistanceLevelPackage/);
  assert.match(adminActions, /export async function updateDistanceLevelRegistration/);
  assert.match(adminActions, /assertSingleTargetEvent/);
  assert.match(
    publicPage,
    /renderRegisterAction\(\s*levelRegistrationPackage\.id,\s*myEventRegistration,\s*true,/,
  );
  assert.match(publicPage, /isDistanceLevels && distanceLevels\.length > 0 \? packages\[0\]/);
  assert.match(adminPage, /getEventDistanceLevelProgress/);
  assert.match(adminPage, /remainingDistanceKm/);
  assert.match(publicPage, /event_distance_levels/);
  assert.match(publicPage, /myEventRegistration/);
  assert.match(adminActions, /createEventDistanceLevel/);
  assert.match(adminActions, /deleteEventDistanceLevel/);
  assert.match(myEvents, /Current level/);
});
