import assert from "node:assert/strict";
import test from "node:test";
import {
  buildEventLeaderboards,
  buildRegistrationSeries,
  canTransitionShipmentStatus,
  isShipmentEligible,
  matchesShipmentStatus,
} from "../lib/admin/day8.ts";

test("shipment eligibility requires approved distance to reach the package target", () => {
  assert.equal(
    isShipmentEligible({
      id: "complete",
      approvedDistanceKm: 10,
      targetDistanceKm: 10,
      shipmentStatus: "pending",
    }),
    true,
  );
  assert.equal(
    isShipmentEligible({
      id: "incomplete",
      approvedDistanceKm: 9.99,
      targetDistanceKm: 10,
      shipmentStatus: "pending",
    }),
    false,
  );
});

test("pending shipment queue includes pending and packed records", () => {
  assert.equal(matchesShipmentStatus("pending", "pending"), true);
  assert.equal(matchesShipmentStatus("packed", "pending"), true);
  assert.equal(matchesShipmentStatus("shipped", "pending"), false);
});

test("shipment status can move forward but never backward", () => {
  assert.equal(canTransitionShipmentStatus("pending", "shipped"), true);
  assert.equal(canTransitionShipmentStatus("shipped", "delivered"), true);
  assert.equal(canTransitionShipmentStatus("delivered", "shipped"), false);
  assert.equal(canTransitionShipmentStatus("shipped", "pending"), false);
});

test("daily registration series fills missing days and uses Bangkok dates", () => {
  const series = buildRegistrationSeries(
    [
      { registeredAt: "2026-08-06T17:30:00.000Z" },
      { registeredAt: "2026-08-07T12:00:00.000Z" },
    ],
    "daily",
    new Date("2026-08-07T12:00:00.000Z"),
  );

  assert.equal(series.length, 30);
  assert.equal(series.at(-1)?.key, "2026-08-07");
  assert.equal(series.at(-1)?.registrations, 2);
  assert.equal(series.at(-2)?.registrations, 0);
});

test("leaderboard aggregates distance per runner and keeps the top ten per event", () => {
  const rows = Array.from({ length: 11 }, (_, index) => ({
    eventId: "event-a",
    eventTitle: "งาน A",
    userId: `user-${index}`,
    userName: `Runner ${index}`,
    distanceKm: index + 1,
  }));
  rows.push({
    eventId: "event-a",
    eventTitle: "งาน A",
    userId: "user-10",
    userName: "Runner 10",
    distanceKm: 5,
  });

  const [event] = buildEventLeaderboards(rows);
  assert.equal(event.runners.length, 10);
  assert.deepEqual(event.runners[0], {
    userId: "user-10",
    userName: "Runner 10",
    distanceKm: 16,
  });
  assert.equal(event.runners.some((runner) => runner.userId === "user-0"), false);
});
