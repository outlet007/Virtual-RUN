import type { createAdminClient } from "@/lib/supabase/admin";
import {
  DEFAULT_SUBMISSION_DAILY_LIMIT,
  DEFAULT_SUBMISSION_MAX_DISTANCE_KM,
} from "@/lib/rules";

type AdminClient = ReturnType<typeof createAdminClient>;

export function getBangkokActivityDate(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export async function loadSubmissionRuleRuntime(
  db: AdminClient,
  registrationId: string,
  activityLocalDate: string,
) {
  const [settingsResult, countResult] = await Promise.all([
    db
      .from("system_settings")
      .select("submission_max_distance_km, submission_daily_limit")
      .eq("id", 1)
      .single(),
    db
      .from("submissions")
      .select("id", { count: "exact", head: true })
      .eq("registration_id", registrationId)
      .eq("activity_local_date", activityLocalDate),
  ]);

  if (settingsResult.error) throw new Error(settingsResult.error.message);
  if (countResult.error) throw new Error(countResult.error.message);

  const maxDistanceKm = Number(settingsResult.data?.submission_max_distance_km);
  const dailySubmissionLimit = Number(settingsResult.data?.submission_daily_limit);

  return {
    maxDistanceKm:
      Number.isFinite(maxDistanceKm) && maxDistanceKm > 0
        ? maxDistanceKm
        : DEFAULT_SUBMISSION_MAX_DISTANCE_KM,
    dailySubmissionLimit:
      Number.isInteger(dailySubmissionLimit) && dailySubmissionLimit > 0
        ? dailySubmissionLimit
        : DEFAULT_SUBMISSION_DAILY_LIMIT,
    existingSubmissionsOnDate: countResult.count ?? 0,
  };
}
