import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(path, "utf8");

test("staff navigation does not expose the all-members page", async () => {
  const layout = await read("app/admin/layout.tsx");
  const staffStart = layout.indexOf("const staffTabs");
  const staffEnd = layout.indexOf("const managerTabs", staffStart);
  const staffTabs = layout.slice(staffStart, staffEnd);

  assert.equal(staffTabs.includes("/admin/events"), true);
  assert.equal(staffTabs.includes("operationalTabs"), false);
  assert.equal(staffTabs.includes("/admin/registrations"), false);
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