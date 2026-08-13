import assert from "node:assert/strict";
import test from "node:test";
import { medalInsertCreatedNewAward } from "../lib/gamification-guards.ts";

test("grants medal benefits only after a newly inserted medal", () => {
  assert.equal(medalInsertCreatedNewAward(null), true);
  assert.equal(medalInsertCreatedNewAward({ code: "23505" }), false);
  assert.equal(medalInsertCreatedNewAward({ code: "42501" }), false);
});