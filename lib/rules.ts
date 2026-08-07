export const MIN_PACE_SECONDS_PER_KM = 150;
export const MAX_PACE_SECONDS_PER_KM = 1200;
export const DEFAULT_SUBMISSION_MAX_DISTANCE_KM = 100;
export const DEFAULT_SUBMISSION_DAILY_LIMIT = 3;

export const SUBMISSION_FLAG_REASON_CODES = [
  "missing_duration",
  "pace_too_fast",
  "pace_too_slow",
  "distance_exceeds_limit",
  "daily_submission_limit_exceeded",
  "activity_before_event",
  "activity_after_event",
] as const;

export type SubmissionFlagReason = (typeof SUBMISSION_FLAG_REASON_CODES)[number];

export const SUBMISSION_FLAG_REASON_LABELS: Record<SubmissionFlagReason, string> = {
  missing_duration: "ไม่มีระยะเวลา หรือระยะเวลาไม่ถูกต้อง",
  pace_too_fast: "Pace เร็วผิดปกติ (ต่ำกว่า 2:30 นาที/กม.)",
  pace_too_slow: "Pace ช้าผิดปกติ (มากกว่า 20:00 นาที/กม.)",
  distance_exceeds_limit: "ระยะทางเกินค่าสูงสุดต่อครั้ง",
  daily_submission_limit_exceeded: "จำนวนการส่งผลในวันเดียวกันเกินกำหนด",
  activity_before_event: "วันที่ทำกิจกรรมอยู่ก่อนวันเริ่มงาน",
  activity_after_event: "วันที่ทำกิจกรรมอยู่หลังวันสิ้นสุดงาน",
};

export type SubmissionRuleInput = {
  distanceKm: number;
  durationSec: number | null;
  activityDate: string;
  eventStartDate: string;
  eventEndDate: string;
  existingSubmissionsOnDate: number;
  maxDistanceKm?: number;
  dailySubmissionLimit?: number;
};

export type SubmissionRuleResult = {
  status: "approved" | "flagged";
  reasons: SubmissionFlagReason[];
};

function dateOnly(value: string) {
  return /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : "";
}

export function evaluateSubmissionRules({
  distanceKm,
  durationSec,
  activityDate,
  eventStartDate,
  eventEndDate,
  existingSubmissionsOnDate,
  maxDistanceKm = DEFAULT_SUBMISSION_MAX_DISTANCE_KM,
  dailySubmissionLimit = DEFAULT_SUBMISSION_DAILY_LIMIT,
}: SubmissionRuleInput): SubmissionRuleResult {
  const reasons: SubmissionFlagReason[] = [];

  if (!durationSec || durationSec <= 0 || !Number.isFinite(durationSec)) {
    reasons.push("missing_duration");
  } else if (Number.isFinite(distanceKm) && distanceKm > 0) {
    const paceSecondsPerKm = durationSec / distanceKm;
    if (paceSecondsPerKm < MIN_PACE_SECONDS_PER_KM) reasons.push("pace_too_fast");
    if (paceSecondsPerKm > MAX_PACE_SECONDS_PER_KM) reasons.push("pace_too_slow");
  }

  if (Number.isFinite(distanceKm) && distanceKm > maxDistanceKm) {
    reasons.push("distance_exceeds_limit");
  }

  if (existingSubmissionsOnDate >= dailySubmissionLimit) {
    reasons.push("daily_submission_limit_exceeded");
  }

  const activityDateOnly = dateOnly(activityDate);
  const eventStartDateOnly = dateOnly(eventStartDate);
  const eventEndDateOnly = dateOnly(eventEndDate);
  if (activityDateOnly && eventStartDateOnly && activityDateOnly < eventStartDateOnly) {
    reasons.push("activity_before_event");
  }
  if (activityDateOnly && eventEndDateOnly && activityDateOnly > eventEndDateOnly) {
    reasons.push("activity_after_event");
  }

  return {
    status: reasons.length > 0 ? "flagged" : "approved",
    reasons,
  };
}

// คง API เดิมไว้สำหรับจุดเรียกภายนอกที่ยังส่งเฉพาะ pace
export function basicRuleCheck(distanceKm: number, durationSec: number | null) {
  return evaluateSubmissionRules({
    distanceKm,
    durationSec,
    activityDate: "",
    eventStartDate: "",
    eventEndDate: "",
    existingSubmissionsOnDate: 0,
    maxDistanceKm: Number.POSITIVE_INFINITY,
    dailySubmissionLimit: Number.POSITIVE_INFINITY,
  }).status;
}
