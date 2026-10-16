import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(path, "utf8");

test("submission review is event-scoped and removed from the global admin navigation", async () => {
  const [layout, overview, legacyPage, adminAuth] = await Promise.all([
    read("app/admin/layout.tsx"),
    read("app/admin/page.tsx"),
    read("app/admin/submissions/page.tsx"),
    read("lib/auth/admin.ts"),
  ]);

  assert.doesNotMatch(layout, /href:\s*["']\/admin\/submissions["']/);
  assert.doesNotMatch(overview, /ผลวิ่งรอตรวจ/);
  assert.match(legacyPage, /redirect\(["']\/admin\/events["']\)/);
  assert.match(adminAuth, /return ["']\/admin\/events["'];/);
});

test("event details place the submission review tab immediately after registrations", async () => {
  const page = await read("app/admin/events/[id]/page.tsx");
  const registrationsTab = page.indexOf('id: "registrations"');
  const submissionsTab = page.lastIndexOf('id: "submissions"');

  assert.ok(registrationsTab >= 0);
  assert.ok(submissionsTab > registrationsTab);
  assert.match(page, /label:\s*["']ตรวจผลวิ่ง["']/);
  assert.match(page, /EventSubmissionsTab eventId=\{event\.id\} searchParams=\{sp\}/);
});

test("staff receive an event-only submission view without manager controls", async () => {
  const [eventPage, eventsPage, eventsLayout, newEventPage] = await Promise.all([
    read("app/admin/events/[id]/page.tsx"),
    read("app/admin/events/page.tsx"),
    read("app/admin/events/layout.tsx"),
    read("app/admin/events/new/page.tsx"),
  ]);

  assert.match(eventsLayout, /requireAdmin/);
  assert.match(eventsPage, /role !== ["']staff["']/);
  assert.match(eventPage, /if \(role === ["']staff["']\)[\s\S]*?id: ["']submissions["']/);
  assert.match(newEventPage, /await requireManager\(\)/);
});

test("submission query and form actions stay inside the selected event", async () => {
  const [tab, actions] = await Promise.all([
    read("components/admin/event-submissions-tab.tsx"),
    read("lib/actions/admin.ts"),
  ]);

  assert.match(tab, /registrations!inner\(event_id,/);
  assert.match(tab, /\.eq\(["']registrations\.event_id["'], eventId\)/);
  assert.match(tab, /name=["']submission_status["']/);
  assert.match(tab, /name=["']event_id["'] value=\{eventId\}/);
  assert.match(actions, /eventSubmissionsPath/);
  assert.match(actions, /`\/admin\/events\/\$\{eventId\}\?tab=submissions`/);
  assert.doesNotMatch(actions, /redirect\(`\/admin\/submissions/);
});
