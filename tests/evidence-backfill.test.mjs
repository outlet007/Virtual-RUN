import assert from "node:assert/strict";
import test from "node:test";
import { planBackfillDuplicateMatches } from "../lib/evidence-backfill.ts";

function hash(character) {
  return character.repeat(64);
}

function row(id, createdAt, sha256, normalizedSha256, phash) {
  return {
    id,
    createdAt,
    fingerprint: { sha256, normalizedSha256, phash },
  };
}

test("backfill points a later normalized duplicate to the earlier submission", () => {
  const plans = planBackfillDuplicateMatches([
    row("later", "2026-08-02T00:00:00.000Z", hash("b"), hash("c"), "0000000000000001"),
    row("earlier", "2026-08-01T00:00:00.000Z", hash("a"), hash("c"), "0000000000000000"),
  ]);

  assert.deepEqual(plans, [
    {
      submissionId: "later",
      id: "earlier",
      type: "normalized",
      distance: 0,
      hardBlock: false,
    },
  ]);
});

test("backfill reports perceptual near-matches without changing status or points", () => {
  const plans = planBackfillDuplicateMatches([
    row("earlier", "2026-08-01T00:00:00.000Z", hash("a"), hash("b"), "0000000000000000"),
    row("later", "2026-08-02T00:00:00.000Z", hash("c"), hash("d"), "0000000000000003"),
  ]);

  assert.equal(plans.length, 1);
  assert.equal(plans[0].submissionId, "later");
  assert.equal(plans[0].id, "earlier");
  assert.equal(plans[0].type, "perceptual");
  assert.equal(plans[0].distance, 2);
  assert.equal("status" in plans[0], false);
  assert.equal("points" in plans[0], false);
});

test("backfill ignores unrelated fingerprints", () => {
  const plans = planBackfillDuplicateMatches([
    row("first", "2026-08-01T00:00:00.000Z", hash("a"), hash("b"), "0000000000000000"),
    row("second", "2026-08-02T00:00:00.000Z", hash("c"), hash("d"), "ffffffffffffffff"),
  ]);

  assert.deepEqual(plans, []);
});
test("backfill can limit planning to the submissions processed in the current batch", () => {
  const rows = [
    row("first", "2026-08-01T00:00:00.000Z", hash("a"), hash("b"), "0000000000000000"),
    row("second", "2026-08-02T00:00:00.000Z", hash("c"), hash("b"), "0000000000000001"),
    row("third", "2026-08-03T00:00:00.000Z", hash("d"), hash("b"), "0000000000000003"),
  ];
  const plans = planBackfillDuplicateMatches(rows, 10, new Set(["third"]));

  assert.equal(plans.length, 1);
  assert.equal(plans[0].submissionId, "third");
  assert.equal(plans[0].id, "first");
  assert.equal(plans[0].type, "normalized");
});
