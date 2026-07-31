"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { basicRuleCheck } from "@/lib/rules";
import { awardForApprovedSubmission } from "@/lib/gamification";

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

  const status = basicRuleCheck(Number(pending!.distance_km), pending!.duration_sec);
  const { data: submission, error } = await supabase
    .from("submissions")
    .insert({
      registration_id: registrationId,
      user_id: user.id,
      source: "strava",
      activity_type: pending!.activity_type,
      distance_km: pending!.distance_km,
      duration_sec: pending!.duration_sec,
      activity_date: pending!.activity_date,
      strava_activity_id: pending!.strava_activity_id,
      status,
    })
    .select("id")
    .single();

  if (error) {
    redirect("/dashboard?error=" + encodeURIComponent(error.message));
  }

  if (status === "approved") {
    await awardForApprovedSubmission(
      registrationId,
      user.id,
      Number(pending!.distance_km),
      submission!.id,
    );
  }

  await supabase.from("strava_pending_activities").delete().eq("id", pendingId);

  revalidatePath("/dashboard");
  redirect("/dashboard?assigned=1");
}
