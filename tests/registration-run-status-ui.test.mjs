import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("event registration tab shows run progress calculated per registration", async () => {
  const page = await readFile("app/admin/events/[id]/page.tsx", "utf8");

  assert.match(page, /packages\(name, target_distance_km\)/);
  assert.match(page, /id, registration_id, status, distance_km/);
  assert.match(page, /approvedDistanceByRegistration\.get\(registration\.id\)/);
  assert.match(page, />สถานะการวิ่ง<\/th>/);
  assert.match(page, /registrationRunStatusLabel\[runProgress\.status\]/);
  assert.match(page, /runProgress\.approvedDistanceKm[\s\S]*runProgress\.targetDistanceKm/);
});
