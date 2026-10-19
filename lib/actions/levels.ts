"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireManager } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { bulkSuccessUrl, splitBulkFormData } from "@/lib/bulk-form";

type LevelCandidate = {
  id?: string;
  level_number: number;
  name: string;
  name_en: string | null;
  min_xp: number;
};

function fail(message: string, path = "/admin/levels"): never {
  const separator = path.includes("?") ? "&" : "?";
  redirect(`${path}${separator}error=${encodeURIComponent(message)}`);
}

function parseCandidate(formData: FormData, errorPath = "/admin/levels"): LevelCandidate {
  const id = String(formData.get("id") ?? "").trim() || undefined;
  const level_number = Number(formData.get("level_number"));
  const name = String(formData.get("name") ?? "").trim();
  const name_en = String(formData.get("name_en") ?? "").trim() || null;
  const min_xp = Number(formData.get("min_xp"));

  if (!Number.isInteger(level_number) || level_number < 1 || level_number > 999) {
    fail("หมายเลข Level ต้องเป็นจำนวนเต็มระหว่าง 1–999", errorPath);
  }
  if (!name || name.length > 50) {
    fail("ชื่อ Level ต้องมีความยาว 1–50 ตัวอักษร", errorPath);
  }
  if (!Number.isInteger(min_xp) || min_xp < 0 || min_xp > 1_000_000_000) {
    fail("XP ขั้นต่ำต้องเป็นจำนวนเต็มระหว่าง 0–1,000,000,000", errorPath);
  }

  return { id, level_number, name, name_en, min_xp };
}

// ตรวจลำดับ Level ทั้งชุดหลังแทนค่าด้วยรายการที่แก้ไข (รองรับแก้หลายรายการพร้อมกัน)
async function validateLevelSequence(
  candidates: LevelCandidate[],
  errorPath = "/admin/levels",
) {
  const db = createAdminClient();
  const { data, error } = await db
    .from("levels")
    .select("id, level_number, name, min_xp");
  if (error) fail(error.message, errorPath);

  const editedIds = new Set(candidates.map((candidate) => candidate.id).filter(Boolean));
  const levels = [
    ...(data ?? []).filter((level) => !editedIds.has(level.id)),
    ...candidates.map((candidate) => ({ ...candidate, id: candidate.id ?? "new-level" })),
  ].sort((a, b) => a.level_number - b.level_number);

  if (levels[0]?.level_number !== 1 || levels[0].min_xp !== 0) {
    fail("ต้องมี Level 1 และกำหนด XP ขั้นต่ำเป็น 0", errorPath);
  }

  for (let index = 1; index < levels.length; index += 1) {
    const previous = levels[index - 1];
    const current = levels[index];
    if (current.level_number === previous.level_number) {
      fail(`มี Level ${current.level_number} อยู่แล้ว`, errorPath);
    }
    if (current.min_xp <= previous.min_xp) {
      fail("XP ขั้นต่ำต้องเพิ่มขึ้นตามลำดับ Level และห้ามซ้ำกัน", errorPath);
    }
  }
}

function refreshLevels() {
  revalidatePath("/admin/levels");
  revalidatePath("/dashboard", "layout");
}

export async function createLevel(formData: FormData) {
  await requireManager();
  const errorPath = "/admin/levels?create=1";
  const candidate = parseCandidate(formData, errorPath);
  await validateLevelSequence([candidate], errorPath);
  const db = createAdminClient();
  const { error } = await db.from("levels").insert({
    level_number: candidate.level_number,
    name: candidate.name,
    name_en: candidate.name_en,
    min_xp: candidate.min_xp,
  });
  if (error) {
    fail(
      error.code === "23505" ? "หมายเลข Level หรือค่า XP นี้มีอยู่แล้ว" : error.message,
      errorPath,
    );
  }
  refreshLevels();
  redirect("/admin/levels?added=1");
}

async function updateLevelRow(candidate: LevelCandidate) {
  const db = createAdminClient();
  const { error } = await db
    .from("levels")
    .update({
      level_number: candidate.level_number,
      name: candidate.name,
      name_en: candidate.name_en,
      min_xp: candidate.min_xp,
      updated_at: new Date().toISOString(),
    })
    .eq("id", candidate.id)
    .select("id")
    .single();
  return error;
}

async function saveLevel(candidate: LevelCandidate) {
  const error = await updateLevelRow(candidate);
  if (error) fail(error.code === "23505" ? "หมายเลข Level หรือค่า XP นี้มีอยู่แล้ว" : error.message);
}

// level_number และ min_xp เป็น unique: เลื่อนค่าหลายแถวพร้อมกันอาจชนค่าที่แถวอื่นยังไม่ขยับ
// จึงลองซ้ำเป็นรอบจนครบ (ชุดสุดท้ายผ่าน validateLevelSequence แล้ว) ยกเว้นการสลับค่าเป็นวง
async function saveLevels(candidates: LevelCandidate[]) {
  let pending = candidates;
  while (pending.length > 0) {
    const conflicted: LevelCandidate[] = [];
    for (const candidate of pending) {
      const error = await updateLevelRow(candidate);
      if (error?.code === "23505") conflicted.push(candidate);
      else if (error) fail(error.message);
    }
    if (conflicted.length === pending.length) {
      fail("สลับหมายเลข Level หรือค่า XP ระหว่างรายการในครั้งเดียวไม่ได้ กรุณาบันทึกทีละขั้น");
    }
    pending = conflicted;
  }
}

export async function updateLevel(formData: FormData) {
  await requireManager();
  const candidate = parseCandidate(formData);
  if (!candidate.id) fail("ไม่พบ Level ที่ต้องการแก้ไข");
  await validateLevelSequence([candidate]);
  await saveLevel(candidate);
  refreshLevels();
  redirect("/admin/levels?saved=1");
}

export async function bulkUpdateLevels(formData: FormData) {
  await requireManager();
  const candidates = splitBulkFormData(formData).map((item) => parseCandidate(item));
  if (candidates.length === 0 || candidates.some((candidate) => !candidate.id)) {
    fail("ไม่พบ Level ที่ต้องการแก้ไข");
  }
  if (new Set(candidates.map((candidate) => candidate.id)).size !== candidates.length) {
    fail("ข้อมูลที่บันทึกพร้อมกันไม่ถูกต้อง");
  }
  await validateLevelSequence(candidates);
  await saveLevels(candidates);
  refreshLevels();
  redirect(bulkSuccessUrl("/admin/levels?saved=1", formData, candidates.length));
}

export async function deleteLevel(formData: FormData) {
  await requireManager();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) fail("ไม่พบ Level ที่ต้องการลบ");
  const db = createAdminClient();
  const { data: level, error: readError } = await db
    .from("levels")
    .select("level_number")
    .eq("id", id)
    .single();
  if (readError || !level) fail(readError?.message ?? "ไม่พบ Level ที่ต้องการลบ");
  if (level.level_number === 1) fail("ไม่สามารถลบ Level 1 ได้");
  const { error } = await db.from("levels").delete().eq("id", id);
  if (error) fail(error.message);
  refreshLevels();
  redirect("/admin/levels?deleted=1");
}
