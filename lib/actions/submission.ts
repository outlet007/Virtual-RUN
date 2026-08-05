"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createHash } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { basicRuleCheck } from "@/lib/rules";
import { awardForApprovedSubmission } from "@/lib/gamification";
import { readRunEvidence } from "@/lib/ocr/run-evidence";

const EVIDENCE_TYPES = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
} as const;

export async function createSubmission(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const registrationId = String(formData.get("registration_id") ?? "");
  const activityType = String(formData.get("activity_type") ?? "run");
  const distanceKm = Number(formData.get("distance_km") ?? 0);
  const durationHours = Number(formData.get("duration_hours") ?? 0);
  const durationMinutes = Number(formData.get("duration_minutes") ?? 0);
  const durationSeconds = Number(formData.get("duration_seconds") ?? 0);
  const activityDate = String(formData.get("activity_date") ?? "");
  const evidenceFile = formData.get("evidence_file");

  const validDuration =
    Number.isInteger(durationHours) &&
    Number.isInteger(durationMinutes) &&
    Number.isInteger(durationSeconds) &&
    durationHours >= 0 &&
    durationHours <= 99 &&
    durationMinutes >= 0 &&
    durationMinutes <= 59 &&
    durationSeconds >= 0 &&
    durationSeconds <= 59;
  const durationSec = validDuration
    ? durationHours * 3600 + durationMinutes * 60 + durationSeconds
    : 0;

  if (!registrationId || distanceKm <= 0 || !activityDate || durationSec <= 0) {
    redirect(
      "/dashboard/submit?error=" +
        encodeURIComponent("กรอกระยะ เวลา และวันที่ให้ถูกต้อง"),
    );
  }

  if (!(evidenceFile instanceof File) || evidenceFile.size === 0) {
    redirect(
      "/dashboard/submit?error=" +
        encodeURIComponent("ต้องแนบรูปหลักฐานก่อนบันทึกผล"),
    );
  }

  const extension = EVIDENCE_TYPES[evidenceFile.type as keyof typeof EVIDENCE_TYPES];
  if (!extension || evidenceFile.size > 5 * 1024 * 1024) {
    redirect(
      "/dashboard/submit?error=" +
        encodeURIComponent("รองรับเฉพาะไฟล์ PNG, JPG หรือ WebP ขนาดไม่เกิน 5 MB"),
    );
  }

  const { data: registration } = await supabase
    .from("registrations")
    .select("id")
    .eq("id", registrationId)
    .eq("user_id", user.id)
    .eq("status", "confirmed")
    .maybeSingle();
  if (!registration) {
    redirect(
      "/dashboard/submit?error=" +
        encodeURIComponent("ไม่พบใบสมัครที่ยืนยันแล้วสำหรับบัญชีนี้"),
    );
  }

  const imageBuffer = Buffer.from(await evidenceFile.arrayBuffer());
  const evidenceSha256 = createHash("sha256").update(imageBuffer).digest("hex");
  const { data: duplicate } = await supabase
    .from("submissions")
    .select("id")
    .eq("user_id", user.id)
    .eq("evidence_sha256", evidenceSha256)
    .maybeSingle();
  if (duplicate) {
    redirect(
      "/dashboard/submit?error=" +
        encodeURIComponent("รูปหลักฐานนี้เคยใช้บันทึกผลแล้ว"),
    );
  }

  const ocr = await readRunEvidence(imageBuffer, extension, distanceKm);

  // อัปโหลดรูปหลักฐานเข้า storage — เก็บแค่ path ในตาราง (bucket เป็น private)
  const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from("run-evidence")
    .upload(path, evidenceFile, { contentType: evidenceFile.type });

  if (uploadError) {
    redirect("/dashboard/submit?error=" + encodeURIComponent(uploadError.message));
  }
  const evidencePath = path;

  const ruleStatus = basicRuleCheck(distanceKm, durationSec);
  const status = ocr.status === "matched" && ruleStatus === "approved"
    ? "approved"
    : "flagged";

  const db = createAdminClient();
  const { data: submission, error } = await db
    .from("submissions")
    .insert({
      registration_id: registrationId,
      user_id: user.id,
      source: "upload",
      activity_type: activityType,
      distance_km: distanceKm,
      duration_sec: durationSec,
      activity_date: new Date(activityDate).toISOString(),
      evidence_url: evidencePath,
      evidence_sha256: evidenceSha256,
      ocr_status: ocr.status,
      ocr_distance_km: ocr.distanceKm,
      ocr_confidence: ocr.confidence,
      ocr_raw_text: ocr.rawText,
      ocr_processed_at: new Date().toISOString(),
      status,
    })
    .select("id")
    .single();

  if (error) {
    await db.storage.from("run-evidence").remove([evidencePath]);
    redirect("/dashboard/submit?error=" + encodeURIComponent(error.message));
  }

  if (status === "approved") {
    await awardForApprovedSubmission(registrationId, user.id, distanceKm, submission!.id);
  }

  revalidatePath("/dashboard");
  redirect(`/dashboard?submitted=${status}&ocr=${ocr.status}`);
}
