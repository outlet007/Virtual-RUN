"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { basicRuleCheck } from "@/lib/rules";

export async function createSubmission(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const registrationId = String(formData.get("registration_id") ?? "");
  const activityType = String(formData.get("activity_type") ?? "run");
  const distanceKm = Number(formData.get("distance_km") ?? 0);
  const durationMin = Number(formData.get("duration_min") ?? 0);
  const activityDate = String(formData.get("activity_date") ?? "");
  const evidenceUrl = String(formData.get("evidence_url") ?? "");

  if (!registrationId || distanceKm <= 0 || !activityDate) {
    redirect(
      "/dashboard/submit?error=" +
        encodeURIComponent("กรอกระยะและวันที่ให้ครบ"),
    );
  }

  const durationSec = durationMin > 0 ? Math.round(durationMin * 60) : null;
  const status = basicRuleCheck(distanceKm, durationSec);

  const { error } = await supabase.from("submissions").insert({
    registration_id: registrationId,
    user_id: user.id,
    source: "upload",
    activity_type: activityType,
    distance_km: distanceKm,
    duration_sec: durationSec,
    activity_date: new Date(activityDate).toISOString(),
    evidence_url: evidenceUrl || null,
    status,
  });

  if (error) {
    redirect("/dashboard/submit?error=" + encodeURIComponent(error.message));
  }

  revalidatePath("/dashboard");
  redirect("/dashboard?submitted=" + status);
}
