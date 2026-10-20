import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(path, "utf8");

test("migration hides events from members via RLS and blocks registrations and submissions", async () => {
  const sql = await read("supabase/migrations/20261020043625_add_event_visibility.sql");
  assert.match(sql, /add column is_visible boolean not null default true/);
  assert.match(sql, /create policy "events public read" on public\.events\s+for select using \(status in \('open', 'closed'\) and is_visible\);/);
  assert.match(sql, /and events\.is_visible\s+\)\s+\);/);
  assert.match(sql, /or not event_visible/);
  assert.match(sql, /message = 'event_not_available'/);
  assert.match(sql, /before insert on public\.submissions/);
  assert.match(sql, /revoke all on function public\.reject_submission_for_hidden_event\(\) from public, anon, authenticated;/);
});

test("admin event header has an eye toggle beside edit and delete", async () => {
  const [page, list, actions, submission] = await Promise.all([
    read("app/admin/events/[id]/page.tsx"),
    read("app/admin/events/page.tsx"),
    read("lib/actions/admin.ts"),
    read("lib/actions/submission.ts"),
  ]);

  const header = page.slice(page.indexOf("<form action={setEventVisibility}>"));
  assert.ok(header.indexOf("<EditEventModal") > 0 && header.indexOf("<form action={deleteEvent}>") > 0);
  assert.match(page, /name="visible" value=\{event\.is_visible \? "0" : "1"\}/);
  assert.match(page, /aria-label=\{event\.is_visible \? "ซ่อนงานนี้" : "แสดงงานนี้"\}/);
  assert.match(list, /!ev\.is_visible && \(/);

  const action = actions.slice(actions.indexOf("export async function setEventVisibility"));
  assert.match(action, /^export async function setEventVisibility\(formData: FormData\) \{\r?\n  await requireManager\(\);/);
  assert.match(action.slice(0, 800), /update\(\{ is_visible: visible \}\)/);
  assert.match(submission, /error\.message === "event_not_available"/);
});

test("member pages drop registrations of hidden events", async () => {
  const [dashboard, pay, history, submit] = await Promise.all([
    read("app/(dashboard)/dashboard/page.tsx"),
    read("app/(dashboard)/dashboard/pay/[registrationId]/page.tsx"),
    read("app/(dashboard)/dashboard/history/page.tsx"),
    read("app/(dashboard)/dashboard/submit/[registrationId]/page.tsx"),
  ]);
  assert.match(dashboard, /events!inner\(title, title_en\)/);
  assert.match(pay, /events!inner\(title, title_en\)/);
  assert.match(history, /registrations!inner\(events!inner\(title, title_en\)\)/);
  assert.match(submit, /if \(!reg\.events\) notFound\(\);/);
});
