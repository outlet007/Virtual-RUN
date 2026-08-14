"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { evaluateSubmissionRules } from "@/lib/rules";
import { getBangkokActivityDate, loadSubmissionRuleRuntime } from "@/lib/submission-rule-context";
import { awardForApprovedSubmission } from "@/lib/gamification";
import { createActivityFingerprint } from "@/lib/submission-integrity";

type GuardedSubmissionResult = {
  submission_id: string;
  submission_status: "approved" | "flagged";
};

export async function disconnectStrava() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("strava_connections").delete().eq("user_id", user.id);

  revalidatePath("/admin/settings");
  redirect("/admin/settings?strava=disconnected");
}

// user เลือก registration เองให้กิจกรรมที่จับคู่อัตโนมัติไม่ได้ (ไม่มี/มีมากกว่า 1 ใบที่ตรงช่วงวันงาน)
export async function assignPendingActivity(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const pendingId = String(formData.get("pending_id") ?? "");
  const registrationId = String(formData.get("registration_id") ?? "");

  const { data: pending } = await supabase
    .from("strava_pending_activities")
    .select("id, strava_activity_id, activity_type, distance_km, duration_sec, activity_date")
    .eq("id", pendingId)
    .eq("user_id", user.id)
    .single();

  if (!pending || !registrationId) {
    redirect("/dashboard?error=" + encodeURIComponent("ไม่พบกิจกรรมหรือใบสมัคร"));
  }

  const { data: registration } = await supabase
    .from("registrations")
    .select("id, events(start_date, end_date)")
    .eq("id", registrationId)
    .eq("user_id", user.id)
    .eq("status", "confirmed")
    .maybeSingle();
  if (!registration) {
    redirect("/dashboard?error=" + encodeURIComponent("ใบสมัครไม่ถูกต้อง"));
  }

  const registrationEvent = Array.isArray(registration.events)
    ? registration.events[0] ?? null
    : registration.events;
  if (!registrationEvent) {
    redirect("/dashboard?error=" + encodeURIComponent("ไม่พบช่วงเวลาของงาน"));
  }

  const db = createAdminClient();
  const activityLocalDate = getBangkokActivityDate(pending.activity_date);
  const ruleRuntime = await loadSubmissionRuleRuntime(db, registrationId, activityLocalDate);
  const ruleResult = evaluateSubmissionRules({
    distanceKm: Number(pending.distance_km),
    durationSec: pending.duration_sec,
    activityDate: activityLocalDate,
    eventStartDate: registrationEvent.start_date,
    eventEndDate: registrationEvent.end_date,
    ...ruleRuntime,
  });
  const activityFingerprint = createActivityFingerprint({
    activityType: pending.activity_type as "run" | "walk",
    activityDate: activityLocalDate,
    distanceKm: Number(pending.distance_km),
    durationSec: Number(pending.duration_sec),
  });
  const { data: submissionRaw, error } = await db
    .rpc("create_guarded_submission", {
      p_registration_id: registrationId,
      p_user_id: user.id,
      p_source: "strava",
      p_activity_type: pending.activity_type,
      p_distance_km: pending.distance_km,
      p_duration_sec: pending.duration_sec,
      p_activity_date: pending.activity_date,
      p_activity_local_date: activityLocalDate,
      p_flag_reason: ruleResult.reasons,
      p_activity_fingerprint: activityFingerprint,
      p_strava_activity_id: pending.strava_activity_id,
    })
    .single();

  if (error) {
    redirect("/dashboard?error=" + encodeURIComponent(error.message));
  }

  const submission = submissionRaw as GuardedSubmissionResult | null;
  if (!submission) {
    redirect("/dashboard?error=" + encodeURIComponent("บันทึกกิจกรรมไม่สำเร็จ"));
  }
  const status = submission.submission_status;
  if (status === "approved") {
    await awardForApprovedSubmission(
      registrationId,
      user.id,
      Number(pending.distance_km),
      submission.submission_id,
    );
  }

  await supabase.from("strava_pending_activities").delete().eq("id", pendingId);

  revalidatePath("/dashboard");
  redirect("/dashboard?assigned=1");
}
