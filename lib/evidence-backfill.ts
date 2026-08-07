import {
  DEFAULT_PHASH_DISTANCE_THRESHOLD,
  detectEvidenceDuplicate,
  type EvidenceDuplicateMatch,
  type EvidenceFingerprint,
} from "./evidence-fingerprint.ts";

export type BackfillFingerprintRow = {
  id: string;
  createdAt: string;
  fingerprint: EvidenceFingerprint;
};

export type BackfillDuplicatePlan = Exclude<EvidenceDuplicateMatch, null> & {
  submissionId: string;
};

function compareRows(left: BackfillFingerprintRow, right: BackfillFingerprintRow) {
  const byCreatedAt = left.createdAt.localeCompare(right.createdAt);
  return byCreatedAt !== 0 ? byCreatedAt : left.id.localeCompare(right.id);
}

export function planBackfillDuplicateMatches(
  rows: BackfillFingerprintRow[],
  perceptualThreshold = DEFAULT_PHASH_DISTANCE_THRESHOLD,
  targetIds?: ReadonlySet<string>,
) {
  const sorted = [...rows].sort(compareRows);
  const plans: BackfillDuplicatePlan[] = [];
  const previousRows: Array<EvidenceFingerprint & { id: string }> = [];

  sorted.forEach((row) => {
    if (!targetIds || targetIds.has(row.id)) {
      const match = detectEvidenceDuplicate(
        row.fingerprint,
        previousRows,
        perceptualThreshold,
      );
      if (match) plans.push({ submissionId: row.id, ...match });
    }
    previousRows.push({ id: row.id, ...row.fingerprint });
  });

  return plans;
}
