"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { evaluateSubmissionRules } from "@/lib/rules";
import { loadSubmissionRuleRuntime } from "@/lib/submission-rule-context";
import { awardForApprovedSubmission } from "@/lib/gamification";
import { isValidActivityDate } from "@/lib/submission-input";
import { readRunEvidence } from "@/lib/ocr/run-evidence";
import { prepareEvidenceImage } from "@/lib/evidence-fingerprint";
import {
  createActivityFingerprint,
  getSubmissionClientIpHash,
  isDuplicateEvidenceError,
  type SubmissionActivityType,
} from "@/lib/submission-integrity";

const EVIDENCE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

// หน้าบันทึกผลผูกกับ registration ที่เลือกมาแล้วเสมอ (ไม่มี dropdown รวมงานอีกต่อไป)
// ถ้าไม่มี registrationId (เช่น request ผิดปกติ) ให้กลับไปหน้า "งานของฉัน" แทนที่จะสร้าง URL ที่พัง
function submitErrorPath(registrationId: string) {
  return registrationId ? `/dashboard/submit/${registrationId}` : "/dashboard/events";
}

type GuardedSubmissionResult = {
  submission_id: string;
  submission_status: "approved" | "flagged";
};

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

  if (
    !registrationId ||
    (activityType !== "run" && activityType !== "walk") ||
    !Number.isFinite(distanceKm) ||
    distanceKm <= 0 ||
    !isValidActivityDate(activityDate) ||
    durationSec <= 0
  ) {
    redirect(
      submitErrorPath(registrationId) + "?error=" +
        encodeURIComponent("กรอกระยะ เวลา และวันที่ให้ถูกต้อง"),
    );
  }

  if (!(evidenceFile instanceof File) || evidenceFile.size === 0) {
    redirect(
      submitErrorPath(registrationId) + "?error=" +
        encodeURIComponent("ต้องแนบรูปหลักฐานก่อนบันทึกผล"),
    );
  }

  if (!EVIDENCE_TYPES.has(evidenceFile.type) || evidenceFile.size > 5 * 1024 * 1024) {
    redirect(
      submitErrorPath(registrationId) + "?error=" +
        encodeURIComponent("รองรับเฉพาะไฟล์ PNG, JPG หรือ WebP ขนาดไม่เกิน 5 MB"),
    );
  }

  const { data: registration } = await supabase
    .from("registrations")
    .select("id, events(start_date, end_date)")
    .eq("id", registrationId)
    .eq("user_id", user.id)
    .eq("status", "confirmed")
    .maybeSingle();
  if (!registration) {
    redirect(
      submitErrorPath(registrationId) + "?error=" +
        encodeURIComponent("ไม่พบใบสมัครที่ยืนยันแล้วสำหรับบัญชีนี้"),
    );
  }

  const registrationEvent = Array.isArray(registration.events)
    ? registration.events[0] ?? null
    : registration.events;
  if (!registrationEvent) {
    redirect(
      submitErrorPath(registrationId) + "?error=" + encodeURIComponent("ไม่พบช่วงเวลาของงาน"),
    );
  }

  const db = createAdminClient();
  const requestHeaders = await headers();
  const { data: rateLimitResult, error: rateLimitError } = await db.rpc(
    "consume_submission_rate_limit",
    {
      p_user_id: user.id,
      p_ip_hash: getSubmissionClientIpHash(requestHeaders, user.id),
    },
  );
  if (rateLimitError) {
    redirect(
      submitErrorPath(registrationId) + "?error=" +
        encodeURIComponent("ตรวจสอบขีดจำกัดการส่งผลไม่สำเร็จ กรุณาลองอีกครั้ง"),
    );
  }
  if (rateLimitResult !== "allowed") {
    redirect(
      submitErrorPath(registrationId) + "?error=" +
        encodeURIComponent("ส่งผลถี่เกินไป กรุณารอ 10 นาทีแล้วลองอีกครั้ง"),
    );
  }

  let ruleRuntime;
  try {
    ruleRuntime = await loadSubmissionRuleRuntime(db, registrationId, activityDate);
  } catch {
    redirect(
      submitErrorPath(registrationId) + "?error=" +
        encodeURIComponent("ตรวจสอบกฎการส่งผลไม่สำเร็จ กรุณาลองอีกครั้ง"),
    );
  }

  const ruleResult = evaluateSubmissionRules({
    distanceKm,
    durationSec,
    activityDate,
    eventStartDate: registrationEvent.start_date,
    eventEndDate: registrationEvent.end_date,
    ...ruleRuntime,
  });

  const imageBuffer = Buffer.from(await evidenceFile.arrayBuffer());
  let preparedEvidence;
  try {
    preparedEvidence = await prepareEvidenceImage(imageBuffer);
  } catch {
    redirect(
      submitErrorPath(registrationId) + "?error=" +
        encodeURIComponent("ไฟล์หลักฐานเสียหายหรือไม่ใช่รูปภาพที่รองรับ"),
    );
  }
  const { fingerprint } = preparedEvidence;

  const { data: exactDuplicate, error: exactDuplicateError } = await db
    .from("submissions")
    .select("id")
    .eq("evidence_sha256", fingerprint.sha256)
    .maybeSingle();
  if (exactDuplicateError) {
    redirect(
      submitErrorPath(registrationId) + "?error=" +
        encodeURIComponent("ตรวจสอบหลักฐานซ้ำไม่สำเร็จ กรุณาลองอีกครั้ง"),
    );
  }
  if (exactDuplicate) {
    redirect(
      submitErrorPath(registrationId) + "?error=" +
        encodeURIComponent("รูปหลักฐานนี้เคยใช้บันทึกผลแล้ว"),
    );
  }

  const { data: normalizedDuplicate, error: normalizedDuplicateError } = await db
    .from("submissions")
    .select("id")
    .eq("normalized_sha256", fingerprint.normalizedSha256)
    .limit(1)
    .maybeSingle();
  if (normalizedDuplicateError) {
    redirect(
      submitErrorPath(registrationId) + "?error=" +
        encodeURIComponent("ตรวจสอบหลักฐานซ้ำไม่สำเร็จ กรุณาลองอีกครั้ง"),
    );
  }
  if (normalizedDuplicate) {
    redirect(
      submitErrorPath(registrationId) + "?error=" +
        encodeURIComponent("รูปหลักฐานนี้เคยใช้บันทึกผลแล้ว แม้ข้อมูลไฟล์จะถูกเปลี่ยน"),
    );
  }

  const ocr = await readRunEvidence(
    preparedEvidence.storageBuffer,
    preparedEvidence.storageExtension,
    distanceKm,
  );

  // Store only the decoded/re-encoded image in the private bucket.
  const path = `${user.id}/${crypto.randomUUID()}.${preparedEvidence.storageExtension}`;
  const { error: uploadError } = await supabase.storage
    .from("run-evidence")
    .upload(path, preparedEvidence.storageBuffer, {
      contentType: preparedEvidence.storageContentType,
    });

  if (uploadError) {
    redirect(submitErrorPath(registrationId) + "?error=" + encodeURIComponent(uploadError.message));
  }
  const evidencePath = path;
  const activityFingerprint = createActivityFingerprint({
    activityType: activityType as SubmissionActivityType,
    activityDate,
    distanceKm,
    durationSec,
  });

  const { data: submissionRaw, error } = await db
    .rpc("create_guarded_submission", {
      p_registration_id: registrationId,
      p_user_id: user.id,
      p_source: "upload",
      p_activity_type: activityType,
      p_distance_km: distanceKm,
      p_duration_sec: durationSec,
      p_activity_date: new Date(`${activityDate}T00:00:00+07:00`).toISOString(),
      p_activity_local_date: activityDate,
      p_flag_reason: ruleResult.reasons,
      p_activity_fingerprint: activityFingerprint,
      p_evidence_url: evidencePath,
      p_evidence_sha256: fingerprint.sha256,
      p_normalized_sha256: fingerprint.normalizedSha256,
      p_evidence_phash: fingerprint.phash,
      p_ocr_status: ocr.status,
      p_ocr_distance_km: ocr.distanceKm,
      p_ocr_confidence: ocr.confidence,
      p_ocr_raw_text: ocr.rawText,
      p_ocr_processed_at: new Date().toISOString(),
    })
    .single();

  if (error) {
    await db.storage.from("run-evidence").remove([evidencePath]);
    if (isDuplicateEvidenceError(error)) {
      redirect(
        submitErrorPath(registrationId) + "?error=" +
          encodeURIComponent("รูปหลักฐานนี้เคยใช้บันทึกผลแล้ว"),
      );
    }
    redirect(submitErrorPath(registrationId) + "?error=" + encodeURIComponent(error.message));
  }

  const submission = submissionRaw as GuardedSubmissionResult | null;
  if (!submission) {
    await db.storage.from("run-evidence").remove([evidencePath]);
    redirect(
      submitErrorPath(registrationId) + "?error=" +
        encodeURIComponent("บันทึกผลไม่สำเร็จ กรุณาลองอีกครั้ง"),
    );
  }
  const status = submission.submission_status;
  if (status === "approved") {
    await awardForApprovedSubmission(
      registrationId,
      user.id,
      distanceKm,
      submission.submission_id,
    );
  }

  revalidatePath("/dashboard");
  redirect(`/dashboard?submitted=${status}&ocr=${ocr.status}`);
}
