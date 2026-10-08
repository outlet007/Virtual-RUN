import assert from "node:assert/strict";
import test from "node:test";
import {
  getAdminEventStatusFilter,
  getEffectiveEventStatus,
} from "../lib/event-status.ts";

test("closes an open event only after its Bangkok end date", () => {
  assert.equal(getEffectiveEventStatus("open", "2026-10-07", "2026-10-08"), "closed");
  assert.equal(getEffectiveEventStatus("open", "2026-10-08", "2026-10-08"), "open");
  assert.equal(getEffectiveEventStatus("open", "2026-10-09", "2026-10-08"), "open");
});

test("does not rewrite draft, closed, or incomplete event states", () => {
  assert.equal(getEffectiveEventStatus("draft", "2026-10-07", "2026-10-08"), "draft");
  assert.equal(getEffectiveEventStatus("closed", "2026-10-09", "2026-10-08"), "closed");
  assert.equal(getEffectiveEventStatus("open", null, "2026-10-08"), "open");
});

test("builds effective Admin filter plans before pagination", () => {
  assert.deepEqual(getAdminEventStatusFilter("", "2026-10-08"), { kind: "all" });
  assert.deepEqual(getAdminEventStatusFilter("draft", "2026-10-08"), {
    kind: "stored",
    status: "draft",
  });
  assert.deepEqual(getAdminEventStatusFilter("open", "2026-10-08"), {
    kind: "effective-open",
    today: "2026-10-08",
  });
  assert.deepEqual(getAdminEventStatusFilter("closed", "2026-10-08"), {
    kind: "effective-closed",
    today: "2026-10-08",
  });
});
