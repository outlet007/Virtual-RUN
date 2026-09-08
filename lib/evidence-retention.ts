export const DEFAULT_EVIDENCE_RETENTION_DAYS = 180;
export const MIN_EVIDENCE_RETENTION_DAYS = 30;
export const MAX_EVIDENCE_RETENTION_DAYS = 3650;

const CLOSED_EVIDENCE_STATUSES = new Set(["approved", "rejected"]);

type ParseRetentionOptions = {
  allowInherit?: boolean;
  allowKeepForever?: boolean;
};

export function parseEvidenceRetentionDays(
  value: FormDataEntryValue | string | number | null | undefined,
  options: ParseRetentionOptions = {},
): number | null {
  const normalized = String(value ?? "").trim();
  if (!normalized && options.allowInherit) return null;

  const days = Number(normalized);
  if (days === 0 && options.allowKeepForever) return 0;
  if (
    !Number.isInteger(days)
    || days < MIN_EVIDENCE_RETENTION_DAYS
    || days > MAX_EVIDENCE_RETENTION_DAYS
  ) {
    throw new Error(
      `Evidence retention must be an integer between ${MIN_EVIDENCE_RETENTION_DAYS} and ${MAX_EVIDENCE_RETENTION_DAYS} days`,
    );
  }
  return days;
}

export function getEffectiveEvidenceRetentionDays(
  eventDays: number | null | undefined,
  systemDays = DEFAULT_EVIDENCE_RETENTION_DAYS,
) {
  return eventDays ?? systemDays;
}

export function getBangkokIsoDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function getEvidenceRetentionCutoff(now: Date, days: number) {
  const today = getBangkokIsoDate(now);
  const cutoff = new Date(`${today}T00:00:00.000Z`);
  cutoff.setUTCDate(cutoff.getUTCDate() - days);
  return cutoff.toISOString().slice(0, 10);
}

export function isClosedEvidenceStatus(status: string) {
  return CLOSED_EVIDENCE_STATUSES.has(status);
}

export function formatEvidenceBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** unitIndex;
  return `${Number(value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1))} ${units[unitIndex]}`;
}
