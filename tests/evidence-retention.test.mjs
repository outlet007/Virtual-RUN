import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  DEFAULT_EVIDENCE_RETENTION_DAYS,
  formatEvidenceBytes,
  getEffectiveEvidenceRetentionDays,
  getEvidenceRetentionCutoff,
  isClosedEvidenceStatus,
  parseEvidenceRetentionDays,
} from "../lib/evidence-retention.ts";

test("uses a safe 180 day default and validates retention overrides", () => {
  assert.equal(DEFAULT_EVIDENCE_RETENTION_DAYS, 180);
  assert.equal(parseEvidenceRetentionDays("30"), 30);
  assert.equal(parseEvidenceRetentionDays("3650"), 3650);
  assert.equal(parseEvidenceRetentionDays("0", { allowKeepForever: true }), 0);
  assert.equal(parseEvidenceRetentionDays("", { allowInherit: true }), null);
  assert.throws(() => parseEvidenceRetentionDays("29"));
  assert.throws(() => parseEvidenceRetentionDays("3651"));
  assert.throws(() => parseEvidenceRetentionDays("not-a-number"));
});

test("calculates effective days and the Bangkok date cutoff", () => {
  assert.equal(getEffectiveEvidenceRetentionDays(null, 180), 180);
  assert.equal(getEffectiveEvidenceRetentionDays(90, 180), 90);
  assert.equal(getEffectiveEvidenceRetentionDays(0, 180), 0);
  assert.equal(
    getEvidenceRetentionCutoff(new Date("2026-09-08T18:30:00.000Z"), 180),
    "2026-03-13",
  );
});

test("only final review statuses are eligible for evidence deletion", () => {
  assert.equal(isClosedEvidenceStatus("approved"), true);
  assert.equal(isClosedEvidenceStatus("rejected"), true);
  assert.equal(isClosedEvidenceStatus("pending"), false);
  assert.equal(isClosedEvidenceStatus("flagged"), false);
});

test("formats reclaimed storage without overstating unknown bytes", () => {
  assert.equal(formatEvidenceBytes(0), "0 B");
  assert.equal(formatEvidenceBytes(1024), "1 KB");
  assert.equal(formatEvidenceBytes(1_572_864), "1.5 MB");
});

test("migration keeps retention data service-role only", async () => {
  const migration = await readFile(
    new URL(
      "../supabase/migrations/20260908051746_add_evidence_retention.sql",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(migration, /evidence_retention_enabled/i);
  assert.match(migration, /evidence_deleted_at/i);
  assert.match(migration, /evidence_cleanup_runs/i);
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /security invoker/i);
  assert.match(migration, /revoke all .* anon, authenticated, service_role/i);
  assert.match(migration, /grant select, insert .* service_role/i);
  assert.match(migration, /get_evidence_cleanup_candidates/i);
  assert.doesNotMatch(migration, /delete\s+from\s+storage\.objects/i);
});

test("cleanup uses the Storage API before tombstoning database paths", async () => {
  const service = await readFile(
    new URL("../lib/evidence-retention-service.ts", import.meta.url),
    "utf8",
  );
  const removeAt = service.indexOf('.from("run-evidence")');
  const tombstoneAt = service.indexOf("evidence_deleted_at");

  assert.match(service, /^import "server-only";/);
  assert.ok(removeAt >= 0);
  assert.ok(tombstoneAt > removeAt);
  assert.doesNotMatch(service, /schema\(["']storage["']\).*delete/s);
});

test("cron endpoint requires a server-side bearer secret", async () => {
  const route = await readFile(
    new URL("../app/api/cron/evidence-retention/route.ts", import.meta.url),
    "utf8",
  );

  assert.match(route, /EVIDENCE_RETENTION_CRON_SECRET/);
  assert.match(route, /timingSafeEqual/);
  assert.match(route, /export async function POST/);
  assert.doesNotMatch(route, /NEXT_PUBLIC_EVIDENCE/);
});
