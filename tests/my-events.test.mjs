import assert from "node:assert/strict";
import test from "node:test";
import {
  clampMyEventsOffset,
  clampMyEventsPageSize,
  getMyEventsBatchSize,
  parseMyEventsTab,
} from "../lib/my-events.ts";

test("uses device-appropriate event batch sizes", () => {
  assert.equal(getMyEventsBatchSize(390), 4);
  assert.equal(getMyEventsBatchSize(640), 6);
  assert.equal(getMyEventsBatchSize(1024), 9);
});

test("accepts only supported event tabs", () => {
  assert.equal(parseMyEventsTab("past"), "past");
  assert.equal(parseMyEventsTab("current"), "current");
  assert.equal(parseMyEventsTab("unexpected"), "current");
});

test("clamps pagination input to safe values", () => {
  assert.equal(clampMyEventsPageSize("6"), 6);
  assert.equal(clampMyEventsPageSize("99"), 9);
  assert.equal(clampMyEventsPageSize("0"), 1);
  assert.equal(clampMyEventsPageSize("invalid"), 9);
  assert.equal(clampMyEventsOffset("12"), 12);
  assert.equal(clampMyEventsOffset("-5"), 0);
});
