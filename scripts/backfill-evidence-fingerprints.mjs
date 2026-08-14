import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import {
  createEvidenceFingerprint,
  DEFAULT_PHASH_DISTANCE_THRESHOLD,
} from "../lib/evidence-fingerprint.ts";
import { planBackfillDuplicateMatches } from "../lib/evidence-backfill.ts";

function readNumberFlag(name, fallback) {
  const prefix = `--${name}=`;
  const raw = process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`--${name} must be a positive integer`);
  }
  return value;
}

function readStringFlag(name) {
  const prefix = `--${name}=`;
  return process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length) ?? null;
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

async function fetchPages(buildQuery, limit, batchSize) {
  const rows = [];
  for (let offset = 0; rows.length < limit; offset += batchSize) {
    const pageSize = Math.min(batchSize, limit - rows.length);
    const { data, error } = await buildQuery(offset, offset + pageSize - 1);
    if (error) throw new Error(error.message);
    const page = data ?? [];
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  return rows;
}

const applyChanges = process.argv.includes("--apply");
const localMode = process.argv.includes("--local");
const noReport = process.argv.includes("--no-report");
const limit = readNumberFlag("limit", 1000);
const batchSize = Math.min(readNumberFlag("batch-size", 50), 200);
const scanLimit = readNumberFlag("scan-limit", 50_000);
const requestedReportPath = readStringFlag("report");

if (process.argv.includes("--dry-run") && applyChanges) {
  throw new Error("Choose either --dry-run or --apply, not both");
}

let supabaseUrl =
  process.env.BACKFILL_SUPABASE_URL ??
  process.env.SUPABASE_URL ??
  process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey =
  process.env.BACKFILL_SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SUPABASE_SECRET_KEY ??
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (localMode && supabaseUrl) {
  supabaseUrl = supabaseUrl.replace("host.docker.internal", "127.0.0.1");
}
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Missing Supabase URL or service-role key. Load a trusted server-only env file before running.",
  );
}

const db = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const startedAt = new Date();
const errors = [];

console.log(
  `[evidence-backfill] mode=${applyChanges ? "apply" : "dry-run"} local=${localMode} limit=${limit}`,
);

const candidates = await fetchPages(
  (from, to) =>
    db
      .from("submissions")
      .select(
        "id, created_at, evidence_url, evidence_sha256, normalized_sha256, evidence_phash, status",
      )
      .eq("source", "upload")
      .not("evidence_url", "is", null)
      .or("normalized_sha256.is.null,evidence_phash.is.null")
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(from, to),
  limit,
  batchSize,
);

const processed = [];
for (const [index, submission] of candidates.entries()) {
  try {
    const { data: evidence, error: downloadError } = await db.storage
      .from("run-evidence")
      .download(submission.evidence_url);
    if (downloadError || !evidence) {
      throw new Error(downloadError?.message ?? "Evidence download returned no data");
    }

    const fingerprint = await createEvidenceFingerprint(
      Buffer.from(await evidence.arrayBuffer()),
    );
    if (submission.evidence_sha256 && submission.evidence_sha256 !== fingerprint.sha256) {
      throw new Error("Stored SHA-256 does not match the current private Storage object");
    }

    if (applyChanges) {
      const { error: updateError } = await db
        .from("submissions")
        .update({
          evidence_sha256: submission.evidence_sha256 ?? fingerprint.sha256,
          normalized_sha256: fingerprint.normalizedSha256,
          evidence_phash: fingerprint.phash,
        })
        .eq("id", submission.id);
      if (updateError) throw new Error(updateError.message);
    }

    processed.push({
      id: submission.id,
      createdAt: submission.created_at,
      originalStatus: submission.status,
      fingerprint,
    });
    console.log(`[evidence-backfill] ${index + 1}/${candidates.length} ${submission.id} ok`);
  } catch (error) {
    errors.push({ submissionId: submission.id, stage: "fingerprint", message: errorMessage(error) });
    console.error(`[evidence-backfill] ${index + 1}/${candidates.length} ${submission.id} failed`);
  }
}

const storedFingerprints = await fetchPages(
  (from, to) =>
    db
      .from("submissions")
      .select("id, created_at, evidence_sha256, normalized_sha256, evidence_phash")
      .eq("source", "upload")
      .not("evidence_sha256", "is", null)
      .not("normalized_sha256", "is", null)
      .not("evidence_phash", "is", null)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(from, to),
  scanLimit,
  batchSize,
);

const fingerprintRows = new Map(
  storedFingerprints.map((submission) => [
    submission.id,
    {
      id: submission.id,
      createdAt: submission.created_at,
      fingerprint: {
        sha256: submission.evidence_sha256,
        normalizedSha256: submission.normalized_sha256,
        phash: submission.evidence_phash,
      },
    },
  ]),
);
for (const submission of processed) {
  fingerprintRows.set(submission.id, {
    id: submission.id,
    createdAt: submission.createdAt,
    fingerprint: submission.fingerprint,
  });
}

const processedIds = new Set(processed.map((submission) => submission.id));
const duplicatePlans = planBackfillDuplicateMatches(
  [...fingerprintRows.values()],
  DEFAULT_PHASH_DISTANCE_THRESHOLD,
  processedIds,
);

let matchUpdates = 0;
if (applyChanges) {
  for (const plan of duplicatePlans) {
    try {
      const { error } = await db
        .from("submissions")
        .update({
          duplicate_match_type: plan.type,
          duplicate_match_submission_id: plan.id,
          duplicate_similarity_distance: plan.distance,
        })
        .eq("id", plan.submissionId)
        .is("duplicate_match_type", null);
      if (error) throw new Error(error.message);
      matchUpdates += 1;
    } catch (error) {
      errors.push({
        submissionId: plan.submissionId,
        stage: "duplicate-match",
        message: errorMessage(error),
      });
    }
  }
}

const report = {
  mode: applyChanges ? "apply" : "dry-run",
  localMode,
  startedAt: startedAt.toISOString(),
  finishedAt: new Date().toISOString(),
  selected: candidates.length,
  fingerprintsComputed: processed.length,
  fingerprintsScanned: fingerprintRows.size,
  fingerprintUpdates: applyChanges ? processed.length : 0,
  matchUpdates,
  statusChanges: 0,
  pointChanges: 0,
  matches: duplicatePlans.map((plan) => ({
    submissionId: plan.submissionId,
    matchedSubmissionId: plan.id,
    type: plan.type,
    distance: plan.distance,
  })),
  errors,
};

if (!noReport) {
  const timestamp = startedAt.toISOString().replaceAll(":", "-").replace(".000Z", "Z");
  const reportPath = path.resolve(
    requestedReportPath ?? `backfill-reports/evidence-backfill-${timestamp}.json`,
  );
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`[evidence-backfill] report=${reportPath}`);
}

console.log(JSON.stringify(report));
if (errors.length > 0) process.exitCode = 1;
