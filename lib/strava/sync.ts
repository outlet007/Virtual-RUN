import { createAdminClient } from "@/lib/supabase/admin";
import { evaluateSubmissionRules } from "@/lib/rules";
import { getBangkokActivityDate, loadSubmissionRuleRuntime } from "@/lib/submission-rule-context";
import { refreshAccessToken, type StravaActivity } from "@/lib/strava/api";
import { awardForApprovedSubmission } from "@/lib/gamification";
import { createActivityFingerprint } from "@/lib/submission-integrity";

type StravaConnection = {
  id: string;
  user_id: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
};

// รีเฟรช token ถ้าใกล้/เลยหมดอายุ (Strava access token อายุ 6 ชม.) แล้วบันทึกกลับ
export async function getValidAccessToken(connection: StravaConnection): Promise<string> {
  const expiresAt = new Date(connection.token_expires_at).getTime();
  const bufferMs = 5 * 60 * 1000; // เผื่อ 5 นาทีก่อนหมดอายุจริง
  if (expiresAt - bufferMs > Date.now()) {
    return connection.access_token;
  }

  const refreshed = await refreshAccessToken(connection.refresh_token);
  const db = createAdminClient();
  await db
    .from("strava_connections")
    .update({
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token,
      token_expires_at: new Date(refreshed.expires_at * 1000).toISOString(),
    })
    .eq("id", connection.id);

  return refreshed.access_token;
}

function mapActivityType(stravaType: string): "run" | "walk" | null {
  const t = stravaType.toLowerCase();
  if (t === "run") return "run";
  if (t === "walk") return "walk";
  return null;
}

type RegistrationMatch = {
  id: string;
  packages: { activity_types: string[] } | null;
  events: { start_date: string; end_date: string } | null;
};

type GuardedSubmissionResult = {
  submission_id: string;
  submission_status: "approved" | "flagged";
};

// จับคู่กิจกรรมกับ registration ที่ confirmed + อยู่ในช่วงวันงาน + ประเภทตรงกัน
// ตรงกันพอดี 1 ใบ → สร้าง submission เลย, ไม่ตรงเลย/ตรงมากกว่า 1 → พักไว้ให้ user เลือกเอง
export async function syncActivityForUser(userId: string, activity: StravaActivity) {
  const activityType = mapActivityType(activity.type);
  if (!activityType) return; // ไม่ใช่วิ่ง/เดิน ไม่เกี่ยวข้องกับระบบนี้

  const db = createAdminClient();
  const distanceKm = activity.distance / 1000;
  const durationSec = activity.moving_time;
  const activityDate = new Date(activity.start_date);
  const activityDateStr =
    activity.start_date_local?.slice(0, 10) || getBangkokActivityDate(activityDate);

  const { data: regsRaw } = await db
    .from("registrations")
    .select("id, packages(activity_types), events(start_date, end_date)")
    .eq("user_id", userId)
    .eq("status", "confirmed");

  const regs = (regsRaw ?? []) as unknown as RegistrationMatch[];
  const matches = regs.filter((r) => {
    const ev = r.events;
    const pkg = r.packages;
    if (!ev || !pkg) return false;
    if (activityDateStr < ev.start_date || activityDateStr > ev.end_date) return false;
    return pkg.activity_types.includes(activityType);
  });

  if (matches.length === 1) {
    const registration = matches[0];
    const ruleRuntime = await loadSubmissionRuleRuntime(db, registration.id, activityDateStr);
    const ruleResult = evaluateSubmissionRules({
      distanceKm,
      durationSec,
      activityDate: activityDateStr,
      eventStartDate: registration.events!.start_date,
      eventEndDate: registration.events!.end_date,
      ...ruleRuntime,
    });
    const activityFingerprint = createActivityFingerprint({
      activityType,
      activityDate: activityDateStr,
      distanceKm,
      durationSec,
    });
    const { data: submissionRaw, error } = await db
      .rpc("create_guarded_submission", {
        p_registration_id: registration.id,
        p_user_id: userId,
        p_source: "strava",
        p_activity_type: activityType,
        p_distance_km: distanceKm,
        p_duration_sec: durationSec,
        p_activity_date: activityDate.toISOString(),
        p_activity_local_date: activityDateStr,
        p_flag_reason: ruleResult.reasons,
        p_activity_fingerprint: activityFingerprint,
        p_strava_activity_id: String(activity.id),
      })
      .single();

    if (error) {
      // unique constraint บน strava_activity_id กัน webhook redelivery ซ้ำ — ชนแล้วเฉยไว้ (award ไปแล้วตอน insert ครั้งแรก)
      if (error.code !== "23505") throw error;
      return;
    }

    const submission = submissionRaw as GuardedSubmissionResult | null;
    if (!submission) throw new Error("guarded_submission_returned_no_row");
    const status = submission.submission_status;
    if (status === "approved") {
      await awardForApprovedSubmission(
        registration.id,
        userId,
        distanceKm,
        submission.submission_id,
      );
    }
    return;
  }

  // ไม่มี/มีมากกว่า 1 ใบที่ตรง → พักไว้ให้ user เลือกเอง
  const { error } = await db.from("strava_pending_activities").upsert(
    {
      user_id: userId,
      strava_activity_id: String(activity.id),
      activity_type: activityType,
      distance_km: distanceKm,
      duration_sec: durationSec,
      activity_date: activityDate.toISOString(),
    },
    { onConflict: "user_id,strava_activity_id" },
  );
  if (error) throw error;
}
