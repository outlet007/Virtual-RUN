"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSuperAdmin } from "@/lib/auth/admin";
import { parseEvidenceRetentionDays } from "@/lib/evidence-retention";
import { runEvidenceCleanup } from "@/lib/evidence-retention-service";
import { createAdminClient } from "@/lib/supabase/admin";

function fail(message: string): never {
  redirect(`/admin/storage?error=${encodeURIComponent(message)}`);
}

// Evidence retention settings are restricted to Super Admins.

export async function updateEvidenceRetentionSettings(formData: FormData) {
  await requireSuperAdmin();
  let days: number;
  try {
    days = parseEvidenceRetentionDays(formData.get("retention_days"))!;
  } catch {
    fail("จำนวนวันต้องเป็นเลขจำนวนเต็มระหว่าง 30 ถึง 3,650 วัน");
  }

  const db = createAdminClient();
  const { error } = await db
    .from("system_settings")
    .update({
      evidence_retention_enabled: formData.get("retention_enabled") === "on",
      evidence_retention_days: days,
    })
    .eq("id", 1);
  if (error) fail(error.message);

  revalidatePath("/admin/storage");
  redirect("/admin/storage?saved=1");
}

export async function updateEventEvidenceRetention(formData: FormData) {
  await requireSuperAdmin();
  const eventId = String(formData.get("event_id") ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(eventId)) fail("ไม่พบกิจกรรมที่ต้องการแก้ไข");

  let days: number | null;
  try {
    days = parseEvidenceRetentionDays(formData.get("event_retention_days"), {
      allowInherit: true,
      allowKeepForever: true,
    });
  } catch {
    fail("เว้นว่างเพื่อใช้ค่าระบบ ใส่ 0 เพื่อเก็บถาวร หรือกำหนด 30 ถึง 3,650 วัน");
  }

  const db = createAdminClient();
  const { error } = await db
    .from("events")
    .update({ evidence_retention_days: days })
    .eq("id", eventId);
  if (error) fail(error.message);

  revalidatePath("/admin/storage");
  redirect("/admin/storage?event_saved=1");
}

export async function runEvidenceCleanupAction(formData: FormData) {
  const { user } = await requireSuperAdmin();
  if (String(formData.get("confirmation") ?? "").trim() !== "DELETE") {
    fail("กรุณาพิมพ์ DELETE เพื่อยืนยันการลบไฟล์แบบถาวร");
  }

  const eventId = String(formData.get("event_id") ?? "").trim() || null;
  if (eventId && !/^[0-9a-f-]{36}$/i.test(eventId)) fail("กิจกรรมไม่ถูกต้อง");

  let result;
  try {
    result = await runEvidenceCleanup({
      requestedBy: user.id,
      source: "manual",
      eventId,
      limit: 500,
    });
  } catch (error) {
    console.error("Evidence cleanup failed", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
    fail("ลบหลักฐานไม่สำเร็จ กรุณาตรวจ Supabase Storage และ server log");
  }

  revalidatePath("/admin/storage");
  const params = new URLSearchParams({
    deleted: String(result.deletedFiles),
    reclaimed: String(result.reclaimedBytes),
  });
  if (result.disabled) params.set("disabled", "1");
  redirect(`/admin/storage?${params.toString()}`);
}
