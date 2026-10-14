import assert from "node:assert/strict";
import test from "node:test";
import { getRegistrationRunProgress } from "../lib/registration-progress.ts";

test("marks a confirmed registration complete when approved distance reaches its package target", () => {
  assert.deepEqual(
    getRegistrationRunProgress({
      registrationStatus: "confirmed",
      approvedDistanceKm: 10,
      targetDistanceKm: 10,
    }),
    {
      status: "completed",
      approvedDistanceKm: 10,
      targetDistanceKm: 10,
    },
  );
});

test("keeps confirmed registrations in progress until approved distance reaches the target", () => {
  assert.equal(
    getRegistrationRunProgress({
      registrationStatus: "confirmed",
      approvedDistanceKm: 9.99,
      targetDistanceKm: 10,
    }).status,
    "in_progress",
  );
  assert.equal(
    getRegistrationRunProgress({
      registrationStatus: "confirmed",
      approvedDistanceKm: 0,
      targetDistanceKm: 10,
    }).status,
    "not_started",
  );
});

test("registration state takes precedence over accumulated distance", () => {
  assert.equal(
    getRegistrationRunProgress({
      registrationStatus: "pending",
      approvedDistanceKm: 12,
      targetDistanceKm: 10,
    }).status,
    "registration_pending",
  );
  assert.equal(
    getRegistrationRunProgress({
      registrationStatus: "cancelled",
      approvedDistanceKm: 12,
      targetDistanceKm: 10,
    }).status,
    "cancelled",
  );
});

test("normalizes invalid or negative distance values", () => {
  assert.deepEqual(
    getRegistrationRunProgress({
      registrationStatus: "confirmed",
      approvedDistanceKm: -5,
      targetDistanceKm: Number.NaN,
    }),
    {
      status: "not_started",
      approvedDistanceKm: 0,
      targetDistanceKm: 0,
    },
  );
});
