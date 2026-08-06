"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireManager } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/admin";

type LevelCandidate = {
  id?: string;
  level_number: number;
  name: string;
  min_xp: number;
};

function fail(message: string): never {
  redirect(`/admin/levels?error=${encodeURIComponent(message)}`);
}

function parseCandidate(formData: FormData): LevelCandidate {
  const id = String(formData.get("id") ?? "").trim() || undefined;
  const level_number = Number(formData.get("level_number"));
  const name = String(formData.get("name") ?? "").trim();
  const min_xp = Number(formData.get("min_xp"));

  if (!Number.isInteger(level_number) || level_number < 1 || level_number > 999) {
    fail("หมายเลข Level ต้องเป็นจำนวนเต็มระหว่าง 1–999");
  }
  if (!name || name.length > 50) {
    fail("ชื่อ Level ต้องมีความยาว 1–50 ตัวอักษร");
  }
  if (!Number.isInteger(min_xp) || min_xp < 0 || min_xp > 1_000_000_000) {
    fail("XP ขั้นต่ำต้องเป็นจำนวนเต็มระหว่าง 0–1,000,000,000");
  }

  return { id, level_number, name, min_xp };
}

async function validateLevelSequence(candidate: LevelCandidate) {
  const db = createAdminClient();
  const { data, error } = await db
    .from("levels")
    .select("id, level_number, name, min_xp");
  if (error) fail(error.message);

  const levels = [
    ...(data ?? []).filter((level) => level.id !== candidate.id),
    { ...candidate, id: candidate.id ?? "new-level" },
  ].sort((a, b) => a.level_number - b.level_number);

  if (levels[0]?.level_number !== 1 || levels[0].min_xp !== 0) {
    fail("ต้องมี Level 1 และกำหนด XP ขั้นต่ำเป็น 0");
  }

  for (let index = 1; index < levels.length; index += 1) {
    const previous = levels[index - 1];
    const current = levels[index];
    if (current.level_number === previous.level_number) {
      fail(`มี Level ${current.level_number} อยู่แล้ว`);
    }
    if (current.min_xp <= previous.min_xp) {
      fail("XP ขั้นต่ำต้องเพิ่มขึ้นตามลำดับ Level และห้ามซ้ำกัน");
    }
  }
}

function refreshLevels() {
  revalidatePath("/admin/levels");
  revalidatePath("/dashboard", "layout");
}

export async function createLevel(formData: FormData) {
  await requireManager();
  const candidate = parseCandidate(formData);
  await validateLevelSequence(candidate);
  const db = createAdminClient();
  const { error } = await db.from("levels").insert({
    level_number: candidate.level_number,
    name: candidate.name,
    min_xp: candidate.min_xp,
  });
  if (error) fail(error.code === "23505" ? "หมายเลข Level หรือค่า XP นี้มีอยู่แล้ว" : error.message);
  refreshLevels();
  redirect("/admin/levels?added=1");
}

export async function updateLevel(formData: FormData) {
  await requireManager();
  const candidate = parseCandidate(formData);
  if (!candidate.id) fail("ไม่พบ Level ที่ต้องการแก้ไข");
  await validateLevelSequence(candidate);
  const db = createAdminClient();
  const { error } = await db
    .from("levels")
    .update({
      level_number: candidate.level_number,
      name: candidate.name,
      min_xp: candidate.min_xp,
      updated_at: new Date().toISOString(),
    })
    .eq("id", candidate.id)
    .select("id")
    .single();
  if (error) fail(error.code === "23505" ? "หมายเลข Level หรือค่า XP นี้มีอยู่แล้ว" : error.message);
  refreshLevels();
  redirect("/admin/levels?saved=1");
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
