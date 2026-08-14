import { createHash } from "node:crypto";

export type SubmissionActivityType = "run" | "walk";

export function createActivityFingerprint({
  activityType,
  activityDate,
  distanceKm,
  durationSec,
}: {
  activityType: SubmissionActivityType;
  activityDate: string;
  distanceKm: number;
  durationSec: number;
}) {
  const canonical = [
    "v1",
    activityType,
    activityDate.slice(0, 10),
    distanceKm.toFixed(2),
    String(durationSec),
  ].join("|");

  return createHash("sha256").update(canonical).digest("hex");
}

export function getSubmissionClientIpHash(
  requestHeaders: Pick<Headers, "get">,
  userId: string,
) {
  const forwarded = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  const address =
    requestHeaders.get("x-real-ip")?.trim() ||
    requestHeaders.get("cf-connecting-ip")?.trim() ||
    forwarded ||
    `user-fallback:${userId}`;

  return createHash("sha256").update(address).digest("hex");
}

export function isDuplicateEvidenceError(error: { code?: string; message?: string } | null) {
  return (
    error?.code === "23505" ||
    error?.message === "duplicate_evidence_exact" ||
    error?.message === "duplicate_evidence_normalized"
  );
}
