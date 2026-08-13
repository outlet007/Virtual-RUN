import assert from "node:assert/strict";
import test from "node:test";
import { isDuplicateNotificationError } from "../lib/notification-idempotency.ts";

test("recognizes Postgres unique-violation errors", () => {
  assert.equal(isDuplicateNotificationError({ code: "23505" }), true);
});

test("does not classify unrelated or missing errors as duplicates", () => {
  assert.equal(isDuplicateNotificationError({ code: "42501" }), false);
  assert.equal(isDuplicateNotificationError(null), false);
});
