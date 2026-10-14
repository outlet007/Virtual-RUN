import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationPath =
  "supabase/migrations/20261014024232_add_event_distance_levels.sql";

test("migration creates secured event distance levels and idempotent achievements", async () => {
  const sql = await readFile(migrationPath, "utf8");

  assert.match(sql, /event_mode in \('single_target', 'distance_levels'\)/);
  assert.match(sql, /create table public\.event_distance_levels/);
  assert.match(sql, /create table public\.registration_distance_level_achievements/);
  assert.match(sql, /unique \(registration_id, level_id\)/);
  assert.match(sql, /registrations_one_active_distance_level_event_idx/);
  assert.match(sql, /sync_registration_distance_levels/);
  assert.match(sql, /on conflict \(registration_id, level_id\) do nothing/);
  assert.match(sql, /enable row level security/g);
  assert.match(sql, /grant select on table public\.event_distance_levels to anon, authenticated/);
  assert.match(sql, /grant execute on function public\.sync_registration_distance_levels\(uuid\) to service_role/);
  assert.doesNotMatch(
    sql,
    /grant execute on function public\.sync_registration_distance_levels\(uuid\) to (?:anon|authenticated)/,
  );
});

test("admin, public event and applicant views expose cumulative levels", async () => {
  const [adminPage, publicPage, adminActions, myEvents] = await Promise.all([
    readFile("app/admin/events/[id]/page.tsx", "utf8"),
    readFile("app/events/[id]/page.tsx", "utf8"),
    readFile("lib/actions/admin.ts", "utf8"),
    readFile("components/dashboard/my-events-tabs.tsx", "utf8"),
  ]);

  assert.match(adminPage, /id: "distance-levels"/);
  assert.match(adminPage, /getEventDistanceLevelProgress/);
  assert.match(adminPage, /remainingDistanceKm/);
  assert.match(publicPage, /event_distance_levels/);
  assert.match(publicPage, /myEventRegistration/);
  assert.match(adminActions, /createEventDistanceLevel/);
  assert.match(adminActions, /deleteEventDistanceLevel/);
  assert.match(myEvents, /Current level/);
});
