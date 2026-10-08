import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { isEventSubmissionOpen } from "../lib/event-registration.ts";

const submissionAction = fs.readFileSync("lib/actions/submission.ts", "utf8");
const submissionPage = fs.readFileSync(
  "app/(dashboard)/dashboard/submit/[registrationId]/page.tsx",
  "utf8",
);
const myEventsTabs = fs.readFileSync("components/dashboard/my-events-tabs.tsx", "utf8");

test("allows web submission through the event end date", () => {
  assert.equal(isEventSubmissionOpen("2026-10-08", "2026-10-08"), true);
});

test("closes web submission after the event end date", () => {
  assert.equal(isEventSubmissionOpen("2026-10-07", "2026-10-08"), false);
  assert.equal(isEventSubmissionOpen(null, "2026-10-08"), false);
});

test("enforces the submission window in every web entry point", () => {
  assert.match(submissionAction, /isEventSubmissionOpen\(registrationEvent\.end_date\)/);
  assert.match(submissionPage, /isEventSubmissionOpen\(reg\.events\.end_date\)/);
  assert.match(myEventsTabs, /isEventSubmissionOpen\(item\.event\.end_date\)/);
});
