import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import test from "node:test";

const sqlPath = "supabase/sample-data/virtual-run-v3.8.sql";

test("sample data is synthetic, transactional, and safe to rerun", async () => {
  const sql = await readFile(sqlPath, "utf8");

  assert.match(sql, /^begin;/m);
  assert.match(sql, /^commit;/m);
  assert.match(sql, /set local timezone = 'Asia\/Bangkok'/);
  assert.match(sql, /on conflict \(id\) do update set/i);
  assert.doesNotMatch(sql, /insert\s+into\s+auth\./i);
  assert.doesNotMatch(sql, /\b(delete\s+from|truncate|drop\s+table)\b/i);
  assert.doesNotMatch(sql, /password_hash|access_token|refresh_token|service_role/i);
});

test("sample data covers the version 3.8 public catalog", async () => {
  const sql = await readFile(sqlPath, "utf8");

  for (const table of [
    "events",
    "medals",
    "physical_medals",
    "packages",
    'reward_pickup_locations',
    "rewards",
    "hero_banners",
    "content_categories",
    "content_articles",
  ]) {
    assert.match(sql, new RegExp(`insert\\s+into\\s+public\\.${table}\\s*\\(`, "i"));
  }

  for (const prefix of ["10", "20", "30", "40", "50", "60", "70", "80"]) {
    assert.match(sql, new RegExp(`'${prefix}000000-0000-4000-8000-`));
  }
});

test("every sample image points to a repository asset", async () => {
  const sql = await readFile(sqlPath, "utf8");
  const paths = [...sql.matchAll(/'\/(mock-events\/[^']+)'/g)].map((match) => match[1]);

  assert.ok(paths.length > 0);
  for (const path of new Set(paths)) {
    assert.equal(existsSync(`public/${path}`), true, `Missing public/${path}`);
  }
});

test("Ubuntu installer fails on SQL errors and never restarts Supabase", async () => {
  const [installer, guide] = await Promise.all([
    readFile("scripts/install-sample-data.sh", "utf8"),
    readFile("supabase/sample-data/INSTALL-TH.md", "utf8"),
  ]);

  assert.match(installer, /^set -Eeuo pipefail$/m);
  assert.match(installer, /--set=ON_ERROR_STOP=1/);
  assert.match(installer, /docker compose exec -T db/);
  assert.doesNotMatch(installer, /docker compose (up|down|restart|stop)/);
  assert.match(guide, /ไม่ restart Database\/Auth\/REST/);
});
