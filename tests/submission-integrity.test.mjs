import assert from "node:assert/strict";
import test from "node:test";
import {
  createActivityFingerprint,
  getSubmissionClientIpHash,
  isDuplicateEvidenceError,
} from "../lib/submission-integrity.ts";

test("activity fingerprint is stable for the same normalized activity", () => {
  const input = {
    activityType: "run",
    activityDate: "2026-08-14",
    distanceKm: 5,
    durationSec: 1800,
  };
  assert.equal(createActivityFingerprint(input), createActivityFingerprint({ ...input }));
  assert.notEqual(
    createActivityFingerprint(input),
    createActivityFingerprint({ ...input, durationSec: 1801 }),
  );
});

test("submission client address prefers trusted proxy headers and is never stored raw", () => {
  const headers = new Headers({
    "x-real-ip": "203.0.113.9",
    "x-forwarded-for": "198.51.100.7, 10.0.0.1",
  });
  const hash = getSubmissionClientIpHash(headers, "user-1");
  assert.match(hash, /^[0-9a-f]{64}$/);
  assert.equal(hash.includes("203.0.113.9"), false);
});

test("duplicate evidence errors include guarded RPC and unique index failures", () => {
  assert.equal(isDuplicateEvidenceError({ code: "23505" }), true);
  assert.equal(isDuplicateEvidenceError({ message: "duplicate_evidence_normalized" }), true);
  assert.equal(isDuplicateEvidenceError({ code: "P0001", message: "other" }), false);
});
