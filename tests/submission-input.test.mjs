import assert from "node:assert/strict";
import test from "node:test";
import { isValidActivityDate } from "../lib/submission-input.ts";

test("accepts a real YYYY-MM-DD activity date", () => {
  assert.equal(isValidActivityDate("2026-08-13"), true);
  assert.equal(isValidActivityDate("2024-02-29"), true);
});

test("rejects malformed and impossible activity dates", () => {
  assert.equal(isValidActivityDate("13-08-2026"), false);
  assert.equal(isValidActivityDate("2026-2-03"), false);
  assert.equal(isValidActivityDate("2026-02-29"), false);
  assert.equal(isValidActivityDate("2026-13-01"), false);
});