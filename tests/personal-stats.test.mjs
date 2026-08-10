import assert from "node:assert/strict";
import test from "node:test";
import { buildPersonalDistanceSeries } from "../lib/personal-stats.ts";

test("personal distance series fills 30 Bangkok dates and separates run from walk", () => {
  const series = buildPersonalDistanceSeries(
    [
      { activityDate: "2026-08-06T17:30:00.000Z", activityType: "run", distanceKm: 5.25 },
      { activityDate: "2026-08-07T03:00:00.000Z", activityType: "walk", distanceKm: 2 },
    ],
    new Date("2026-08-07T12:00:00.000Z"),
  );

  assert.equal(series.length, 30);
  assert.equal(series.at(-1)?.key, "2026-08-07");
  assert.deepEqual(series.at(-1), {
    key: "2026-08-07",
    label: "7 ส.ค.",
    runKm: 5.25,
    walkKm: 2,
    totalKm: 7.25,
  });
  assert.equal(series.at(-2)?.totalKm, 0);
});

test("personal distance series aggregates multiple activities on the same day", () => {
  const series = buildPersonalDistanceSeries(
    [
      { activityDate: "2026-08-07T01:00:00.000Z", activityType: "run", distanceKm: 1.111 },
      { activityDate: "2026-08-07T05:00:00.000Z", activityType: "run", distanceKm: 2.222 },
      { activityDate: "2026-08-07T08:00:00.000Z", activityType: "walk", distanceKm: 3.333 },
    ],
    new Date("2026-08-07T12:00:00.000Z"),
  );

  assert.deepEqual(series.at(-1), {
    key: "2026-08-07",
    label: "7 ส.ค.",
    runKm: 3.33,
    walkKm: 3.33,
    totalKm: 6.66,
  });
});
