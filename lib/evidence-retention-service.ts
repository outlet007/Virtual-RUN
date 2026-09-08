import "server-only";

import { getBangkokIsoDate } from "@/lib/evidence-retention";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_DELETE_BATCH = 1000;
const UPDATE_BATCH = 200;

type Candidate = {
  submission_id: string;
  evidence_path: string;
  evidence_size_bytes: number | string | null;
  retention_days: number;
};

export type EvidenceCleanupResult = {
  disabled: boolean;
  matchedFiles: number;
  deletedFiles: number;
  reclaimedBytes: number;
  unknownSizeFiles: number;
};

function chunk<T>(items: T[], size: number) {
  const batches: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }
  return batches;
}

async function audit(input: {
  requestedBy: string | null;
  eventId: string | null;
  source: "manual" | "cron";
  retentionDays: number | null;
  matchedFiles: number;
  deletedFiles: number;
  reclaimedBytes: number;
  failedFiles: number;
  failureSummary?: string;
}) {
  const db = createAdminClient();
  const { error } = await db.from("evidence_cleanup_runs").insert({
    requested_by: input.requestedBy,
    event_id: input.eventId,
    source: input.source,
    retention_days: input.retentionDays,
    matched_files: input.matchedFiles,
    deleted_files: input.deletedFiles,
    reclaimed_bytes: input.reclaimedBytes,
    failed_files: input.failedFiles,
    failure_summary: input.failureSummary?.slice(0, 1000) ?? null,
  });
  if (error) console.error("Unable to record evidence cleanup audit", { message: error.message });
}

export async function runEvidenceCleanup(input: {
  requestedBy: string | null;
  source: "manual" | "cron";
  eventId?: string | null;
  limit?: number;
  dryRun?: boolean;
  now?: Date;
}): Promise<EvidenceCleanupResult> {
  const db = createAdminClient();
  const eventId = input.eventId ?? null;
  const limit = Math.min(Math.max(Math.trunc(input.limit ?? 500), 1), MAX_DELETE_BATCH);
  const settings = await db
    .from("system_settings")
    .select("evidence_retention_enabled")
    .eq("id", 1)
    .single();
  if (settings.error) throw new Error(settings.error.message);
  if (!settings.data.evidence_retention_enabled) {
    return {
      disabled: true,
      matchedFiles: 0,
      deletedFiles: 0,
      reclaimedBytes: 0,
      unknownSizeFiles: 0,
    };
  }

  const result = await db.rpc("get_evidence_cleanup_candidates", {
    p_event_id: eventId,
    p_limit: limit,
    p_today: getBangkokIsoDate(input.now ?? new Date()),
  });
  if (result.error) throw new Error(result.error.message);

  const candidates = (result.data ?? []) as Candidate[];
  const reclaimedBytes = candidates.reduce(
    (sum, item) => sum + Number(item.evidence_size_bytes ?? 0),
    0,
  );
  const unknownSizeFiles = candidates.filter((item) => item.evidence_size_bytes === null).length;
  const summary = {
    disabled: false,
    matchedFiles: candidates.length,
    deletedFiles: 0,
    reclaimedBytes,
    unknownSizeFiles,
  };
  if (input.dryRun || candidates.length === 0) return summary;

  const paths = [...new Set(candidates.map((item) => item.evidence_path).filter(Boolean))];
  const storage = await db.storage.from("run-evidence").remove(paths);
  if (storage.error) {
    await audit({
      requestedBy: input.requestedBy,
      eventId,
      source: input.source,
      retentionDays: eventId ? candidates[0]?.retention_days ?? null : null,
      matchedFiles: candidates.length,
      deletedFiles: 0,
      reclaimedBytes: 0,
      failedFiles: candidates.length,
      failureSummary: storage.error.message,
    });
    throw new Error(storage.error.message);
  }

  const submissionIds = candidates.map((item) => item.submission_id);
  for (const ids of chunk(submissionIds, UPDATE_BATCH)) {
    const update = await db
      .from("submissions")
      .update({
        evidence_url: null,
        evidence_deleted_at: new Date().toISOString(),
        evidence_delete_reason: "retention",
      })
      .in("id", ids);
    if (update.error) {
      await audit({
        requestedBy: input.requestedBy,
        eventId,
        source: input.source,
        retentionDays: eventId ? candidates[0]?.retention_days ?? null : null,
        matchedFiles: candidates.length,
        deletedFiles: candidates.length,
        reclaimedBytes,
        failedFiles: candidates.length,
        failureSummary: `Storage deleted but database update failed: ${update.error.message}`,
      });
      throw new Error(update.error.message);
    }
  }

  await audit({
    requestedBy: input.requestedBy,
    eventId,
    source: input.source,
    retentionDays: eventId ? candidates[0]?.retention_days ?? null : null,
    matchedFiles: candidates.length,
    deletedFiles: candidates.length,
    reclaimedBytes,
    failedFiles: 0,
  });
  return { ...summary, deletedFiles: candidates.length };
}
