"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { evaluateSubmissionRules } from "@/lib/rules";
import { loadSubmissionRuleRuntime } from "@/lib/submission-rule-context";
import { awardForApprovedSubmission } from "@/lib/gamification";
import { isValidActivityDate } from "@/lib/submission-input";
import { readRunEvidence } from "@/lib/ocr/run-evidence";
import {
  createEvidenceFingerprint,
  DEFAULT_PHASH_DISTANCE_THRESHOLD,
} from "@/lib/evidence-fingerprint";

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

  if (
    !registrationId ||
    !Number.isFinite(distanceKm) ||
    distanceKm <= 0 ||
    !isValidActivityDate(activityDate) ||
    durationSec <= 0
  ) {
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
    .select("id, events(start_date, end_date)")
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

  const registrationEvent = Array.isArray(registration.events)
    ? registration.events[0] ?? null
    : registration.events;
  if (!registrationEvent) {
    redirect(
      "/dashboard/submit?error=" + encodeURIComponent("ไม่พบช่วงเวลาของงาน"),
    );
  }

  const db = createAdminClient();
  let ruleRuntime;
  try {
    ruleRuntime = await loadSubmissionRuleRuntime(db, registrationId, activityDate);
  } catch {
    redirect(
      "/dashboard/submit?error=" +
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
  let fingerprint;
  try {
    fingerprint = await createEvidenceFingerprint(imageBuffer);
  } catch {
    redirect(
      "/dashboard/submit?error=" +
        encodeURIComponent("ไฟล์หลักฐานเสียหายหรือไม่ใช่รูปภาพที่รองรับ"),
    );
  }

  const { data: exactDuplicate, error: exactDuplicateError } = await db
    .from("submissions")
    .select("id")
    .eq("evidence_sha256", fingerprint.sha256)
    .maybeSingle();
  if (exactDuplicateError) {
    redirect(
      "/dashboard/submit?error=" +
        encodeURIComponent("ตรวจสอบหลักฐานซ้ำไม่สำเร็จ กรุณาลองอีกครั้ง"),
    );
  }
  if (exactDuplicate) {
    redirect(
      "/dashboard/submit?error=" +
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
      "/dashboard/submit?error=" +
        encodeURIComponent("ตรวจสอบหลักฐานซ้ำไม่สำเร็จ กรุณาลองอีกครั้ง"),
    );
  }

  let duplicateMatch:
    | { type: "normalized" | "perceptual"; submissionId: string; distance: number }
    | null = normalizedDuplicate
    ? { type: "normalized", submissionId: normalizedDuplicate.id, distance: 0 }
    : null;

  if (!duplicateMatch) {
    const { data: nearMatches, error: nearMatchError } = await db.rpc(
      "find_near_duplicate_evidence",
      {
        candidate_phash: fingerprint.phash,
        max_distance: DEFAULT_PHASH_DISTANCE_THRESHOLD,
      },
    );
    if (nearMatchError) {
      redirect(
        "/dashboard/submit?error=" +
          encodeURIComponent("ตรวจสอบความคล้ายของหลักฐานไม่สำเร็จ กรุณาลองอีกครั้ง"),
      );
    }
    const nearest = (nearMatches as { submission_id: string; distance: number }[] | null)?.[0];
    if (nearest) {
      duplicateMatch = {
        type: "perceptual",
        submissionId: nearest.submission_id,
        distance: nearest.distance,
      };
    }
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

  const status = !duplicateMatch && ocr.status === "matched" && ruleResult.status === "approved"
    ? "approved"
    : "flagged";

  const { data: submission, error } = await db
    .from("submissions")
    .insert({
      registration_id: registrationId,
      user_id: user.id,
      source: "upload",
      activity_type: activityType,
      distance_km: distanceKm,
      duration_sec: durationSec,
      activity_date: new Date(`${activityDate}T00:00:00+07:00`).toISOString(),
      activity_local_date: activityDate,
      flag_reason: ruleResult.reasons,
      evidence_url: evidencePath,
      evidence_sha256: fingerprint.sha256,
      normalized_sha256: fingerprint.normalizedSha256,
      evidence_phash: fingerprint.phash,
      duplicate_match_type: duplicateMatch?.type ?? null,
      duplicate_match_submission_id: duplicateMatch?.submissionId ?? null,
      duplicate_similarity_distance: duplicateMatch?.distance ?? null,
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
    if (error.code === "23505") {
      redirect(
        "/dashboard/submit?error=" +
          encodeURIComponent("รูปหลักฐานนี้เคยใช้บันทึกผลแล้ว"),
      );
    }
    redirect("/dashboard/submit?error=" + encodeURIComponent(error.message));
  }

  if (status === "approved") {
    await awardForApprovedSubmission(registrationId, user.id, distanceKm, submission!.id);
  }

  revalidatePath("/dashboard");
  redirect(`/dashboard?submitted=${status}&ocr=${ocr.status}`);
}
