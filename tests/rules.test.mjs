import assert from "node:assert/strict";
import test from "node:test";
import { evaluateSubmissionRules } from "../lib/rules.ts";

const validInput = {
  distanceKm: 10,
  durationSec: 3600,
  activityDate: "2026-08-10",
  eventStartDate: "2026-08-01",
  eventEndDate: "2026-08-31",
  existingSubmissionsOnDate: 0,
  maxDistanceKm: 100,
  dailySubmissionLimit: 3,
};

test("approves a submission when every Day 9 rule passes", () => {
  assert.deepEqual(evaluateSubmissionRules(validInput), {
    status: "approved",
    reasons: [],
  });
});

test("flags a submission when duration is missing", () => {
  const result = evaluateSubmissionRules({ ...validInput, durationSec: null });
  assert.deepEqual(result.reasons, ["missing_duration"]);
});

test("flags pace that is faster than 150 seconds per kilometer", () => {
  const result = evaluateSubmissionRules({ ...validInput, durationSec: 1490 });
  assert.equal(result.status, "flagged");
  assert.deepEqual(result.reasons, ["pace_too_fast"]);
});

test("flags pace that is slower than 1200 seconds per kilometer", () => {
  const result = evaluateSubmissionRules({ ...validInput, durationSec: 12001 });
  assert.deepEqual(result.reasons, ["pace_too_slow"]);
});

test("allows an activity exactly at the configured maximum distance", () => {
  const result = evaluateSubmissionRules({ ...validInput, distanceKm: 50, maxDistanceKm: 50 });
  assert.equal(result.reasons.includes("distance_exceeds_limit"), false);
});

test("uses the configurable maximum distance", () => {
  const result = evaluateSubmissionRules({ ...validInput, distanceKm: 50.01, maxDistanceKm: 50 });
  assert.equal(result.reasons.includes("distance_exceeds_limit"), true);
});

test("flags the next submission after the daily limit is reached", () => {
  const belowLimit = evaluateSubmissionRules({
    ...validInput,
    existingSubmissionsOnDate: 2,
    dailySubmissionLimit: 3,
  });
  const atLimit = evaluateSubmissionRules({
    ...validInput,
    existingSubmissionsOnDate: 3,
    dailySubmissionLimit: 3,
  });
  assert.equal(belowLimit.reasons.includes("daily_submission_limit_exceeded"), false);
  assert.equal(atLimit.reasons.includes("daily_submission_limit_exceeded"), true);
});

test("allows the first and last event dates", () => {
  const firstDay = evaluateSubmissionRules({ ...validInput, activityDate: "2026-08-01" });
  const lastDay = evaluateSubmissionRules({ ...validInput, activityDate: "2026-08-31" });
  assert.equal(firstDay.status, "approved");
  assert.equal(lastDay.status, "approved");
});

test("flags activity dates before and after the event", () => {
  const before = evaluateSubmissionRules({ ...validInput, activityDate: "2026-07-31" });
  const after = evaluateSubmissionRules({ ...validInput, activityDate: "2026-09-01" });
  assert.deepEqual(before.reasons, ["activity_before_event"]);
  assert.deepEqual(after.reasons, ["activity_after_event"]);
});

test("keeps separate reasons when multiple rules fail", () => {
  const result = evaluateSubmissionRules({
    ...validInput,
    distanceKm: 101,
    durationSec: 100,
    existingSubmissionsOnDate: 3,
    activityDate: "2026-09-01",
  });
  assert.deepEqual(result.reasons, [
    "pace_too_fast",
    "distance_exceeds_limit",
    "daily_submission_limit_exceeded",
    "activity_after_event",
  ]);
});
