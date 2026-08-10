import assert from "node:assert/strict";
import test from "node:test";
import { buildEventBibLeaderboard } from "../lib/event-bib-leaderboard.ts";

test("aggregates approved-distance source rows by registration and ranks by total", () => {
  const rows = buildEventBibLeaderboard([
    { registrationId: "reg-1", bibNumber: "VR-002", distanceKm: 5.25 },
    { registrationId: "reg-2", bibNumber: "VR-010", distanceKm: 12 },
    { registrationId: "reg-1", bibNumber: "VR-002", distanceKm: 8 },
  ]);

  assert.deepEqual(rows, [
    { registrationId: "reg-1", bibNumber: "VR-002", distanceKm: 13.25 },
    { registrationId: "reg-2", bibNumber: "VR-010", distanceKm: 12 },
  ]);
});

test("uses numeric BIB ordering for equal distances and applies the requested limit", () => {
  const rows = buildEventBibLeaderboard(
    [
      { registrationId: "reg-10", bibNumber: "VR-10", distanceKm: 5 },
      { registrationId: "reg-2", bibNumber: "VR-2", distanceKm: 5 },
      { registrationId: "reg-3", bibNumber: "VR-3", distanceKm: 4 },
    ],
    2,
  );

  assert.deepEqual(
    rows.map((row) => row.registrationId),
    ["reg-2", "reg-10"],
  );
});
