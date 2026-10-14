import assert from "node:assert/strict";
import test from "node:test";
import {
  getEventDistanceLevelProgress,
  sortEventDistanceLevels,
} from "../lib/event-distance-levels.ts";

const levels = [
  { id: "level-3", name: "Gold", target_distance_km: 65, sort_order: 3 },
  { id: "level-1", name: "Bronze", target_distance_km: 20, sort_order: 1 },
  { id: "level-2", name: "Silver", target_distance_km: 40, sort_order: 2 },
];

test("sorts event distance levels by admin order and target", () => {
  assert.deepEqual(
    sortEventDistanceLevels(levels).map((level) => level.id),
    ["level-1", "level-2", "level-3"],
  );
});

test("reports the current level and remaining distance to the next level", () => {
  const progress = getEventDistanceLevelProgress(levels, 32.5);

  assert.equal(progress.currentLevel?.id, "level-1");
  assert.equal(progress.nextLevel?.id, "level-2");
  assert.equal(progress.finalLevel?.id, "level-3");
  assert.equal(progress.remainingDistanceKm, 7.5);
  assert.equal(progress.completed, false);
});

test("marks progress complete only after the final level", () => {
  const progress = getEventDistanceLevelProgress(levels, 70);

  assert.equal(progress.currentLevel?.id, "level-3");
  assert.equal(progress.nextLevel, null);
  assert.equal(progress.remainingDistanceKm, 0);
  assert.equal(progress.completed, true);
});

test("normalizes invalid distance and empty level definitions", () => {
  assert.deepEqual(getEventDistanceLevelProgress([], Number.NaN), {
    approvedDistanceKm: 0,
    currentLevel: null,
    nextLevel: null,
    finalLevel: null,
    remainingDistanceKm: 0,
    completed: false,
  });
});
