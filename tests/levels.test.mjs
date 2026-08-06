import assert from "node:assert/strict";
import test from "node:test";
import { calculateLevelProgress } from "../lib/levels.ts";

const levels = [
  { level_number: 1, name: "Starter", min_xp: 0 },
  { level_number: 2, name: "Runner", min_xp: 500 },
  { level_number: 3, name: "Champion", min_xp: 1500 },
];

test("calculates progress using configurable XP thresholds", () => {
  assert.deepEqual(calculateLevelProgress(900, levels), {
    level: 2,
    levelName: "Runner",
    currentXp: 400,
    xpPerLevel: 1000,
    totalXp: 900,
    nextLevelXp: 1500,
    isMaxLevel: false,
  });
});

test("treats the highest configured level as max level", () => {
  const progress = calculateLevelProgress(2000, levels);
  assert.equal(progress.level, 3);
  assert.equal(progress.currentXp, 500);
  assert.equal(progress.isMaxLevel, true);
});

test("falls back safely when no levels are returned", () => {
  assert.equal(calculateLevelProgress(1000, []).level, 2);
});
