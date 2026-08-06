import assert from "node:assert/strict";
import test from "node:test";
import { getBangkokDate, isEventRegistrationOpen } from "../lib/event-registration.ts";

test("uses the Bangkok calendar date", () => {
  assert.equal(getBangkokDate(new Date("2026-08-05T18:00:00.000Z")), "2026-08-06");
});

test("allows an open event through its end date", () => {
  assert.equal(
    isEventRegistrationOpen({ status: "open", end_date: "2026-08-06" }, "2026-08-06"),
    true,
  );
});

test("blocks past, closed, and incomplete events", () => {
  assert.equal(
    isEventRegistrationOpen({ status: "open", end_date: "2026-08-05" }, "2026-08-06"),
    false,
  );
  assert.equal(
    isEventRegistrationOpen({ status: "closed", end_date: "2026-08-31" }, "2026-08-06"),
    false,
  );
  assert.equal(isEventRegistrationOpen({ status: "open", end_date: null }, "2026-08-06"), false);
});
