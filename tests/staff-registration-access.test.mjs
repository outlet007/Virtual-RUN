import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { ADMIN_TABS, getAdminTabs } from "../lib/admin/navigation.ts";

const read = (path) => readFile(path, "utf8");

test("admin menu uses one label set and shows tabs per role", () => {
  const labels = (role) => getAdminTabs(role).map((tab) => tab.label);

  assert.deepEqual(labels("staff"), ["งาน"]);
  assert.deepEqual(labels("admin"), [
    "ภาพรวม",
    "สมาชิก",
    "งาน",
    "บทความ",
    "รางวัล",
    "Level",
    "Banner หน้าแรก",
  ]);
  assert.deepEqual(labels("super_admin"), ADMIN_TABS.map((tab) => tab.label));
  assert.equal(new Set(ADMIN_TABS.map((tab) => tab.href)).size, ADMIN_TABS.length);
});

test("admin layout renders the shared menu and admins can open the overview", async () => {
  const [layout, overview, auth] = await Promise.all([
    read("app/admin/layout.tsx"),
    read("app/admin/page.tsx"),
    read("lib/auth/admin.ts"),
  ]);

  assert.match(layout, /const tabs = getAdminTabs\(role\);/);
  assert.equal(layout.includes("งานและเหรียญ"), false);
  assert.equal(overview.includes('role === "admin") redirect'), false);
  assert.match(overview, /if \(role === "staff"\) redirect\("\/admin\/events"\);/);
  assert.match(auth, /if \(role === "staff"\) return "\/admin\/events";\s*return "\/admin";/);
});

test("all-members pages and exports require manager access", async () => {
  const [page, exportRoute, eventExport, actions] = await Promise.all([
    read("app/admin/registrations/page.tsx"),
    read("app/admin/registrations/export/route.ts"),
    read("app/admin/events/[id]/registrations/export/route.ts"),
    read("lib/actions/admin-registrations.ts"),
  ]);

  for (const source of [page, exportRoute, eventExport, actions]) {
    assert.equal(source.includes("requireManager"), true);
    assert.equal(source.includes("await requireAdmin()"), false);
  }
});

test("staff can see a read-only applicant tab scoped to one event", async () => {
  const [eventPage, tab] = await Promise.all([
    read("app/admin/events/[id]/page.tsx"),
    read("components/admin/event-staff-registrations-tab.tsx"),
  ]);
  const staffSection = eventPage.slice(
    eventPage.indexOf('if (role === "staff")'),
    eventPage.indexOf("const { data: event }"),
  );
  const registrations = staffSection.indexOf('id: "registrations"');
  const submissions = staffSection.indexOf('id: "submissions"');

  assert.ok(registrations >= 0);
  assert.ok(submissions > registrations);
  assert.equal(staffSection.includes("EventStaffRegistrationsTab"), true);
  assert.equal(tab.includes('.from("registrations")'), true);
  assert.equal(tab.includes('.eq("event_id", eventId)'), true);
  assert.equal(tab.includes('.from("users")'), false);
  assert.equal(tab.includes("manuallyApproveRegistration"), false);
  assert.equal(tab.includes("LinkButton"), false);
});