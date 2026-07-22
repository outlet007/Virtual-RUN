import { createAdminClient } from "@/lib/supabase/admin";

const POINTS_PER_KM = 1;

type MedalRow = {
  id: string;
  bonus_points: number;
  unlock_rule: { type?: string; target_km?: number } | null;
};

// เรียกทุกครั้งที่ submission กลายเป็น approved (ไม่ว่าจะ auto-approve, admin approve, หรือ sync จาก Strava)
// เขียนผ่าน service-role เสมอ — points/medals เป็นข้อมูลที่ระบบคำนวณให้ ไม่ใช่ user เขียนเอง
export async function awardForApprovedSubmission(
  registrationId: string,
  userId: string,
  distanceKm: number,
  submissionId: string | null = null,
) {
  const db = createAdminClient();

  await db.from("points_ledger").insert({
    user_id: userId,
    delta: Math.round(distanceKm * POINTS_PER_KM),
    reason: "distance",
    ref_type: "submission",
    ref_id: submissionId,
  });

  const { data: reg } = await db
    .from("registrations")
    .select("event_id")
    .eq("id", registrationId)
    .single();
  if (!reg) return;

  const { data: approvedSubs } = await db
    .from("submissions")
    .select("distance_km")
    .eq("registration_id", registrationId)
    .eq("status", "approved");
  const cumulativeKm = (approvedSubs ?? []).reduce(
    (sum, s) => sum + Number(s.distance_km),
    0,
  );

  const { data: medalsRaw } = await db
    .from("medals")
    .select("id, bonus_points, unlock_rule")
    .eq("event_id", reg.event_id);
  const medals = (medalsRaw ?? []) as MedalRow[];

  const { data: earnedRaw } = await db
    .from("user_medals")
    .select("medal_id")
    .eq("user_id", userId);
  const alreadyEarned = new Set((earnedRaw ?? []).map((m) => m.medal_id));

  const newlyEarned = medals.filter((m) => {
    if (alreadyEarned.has(m.id)) return false;
    const targetKm = Number(m.unlock_rule?.target_km ?? Infinity);
    return cumulativeKm >= targetKm;
  });

  for (const medal of newlyEarned) {
    const { error } = await db
      .from("user_medals")
      .insert({ user_id: userId, medal_id: medal.id });
    // unique(user_id, medal_id) กัน insert ซ้ำ — ชนแล้วเฉยไว้ ไม่ถือเป็น error
    if (error && error.code !== "23505") continue;

    if (medal.bonus_points > 0) {
      await db.from("points_ledger").insert({
        user_id: userId,
        delta: medal.bonus_points,
        reason: "medal_bonus",
        ref_type: "medal",
        ref_id: medal.id,
      });
    }
  }
}
