"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function redeemReward(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const rewardId = String(formData.get("reward_id") ?? "");
  if (!rewardId) redirect("/rewards?error=" + encodeURIComponent("ไม่พบรางวัล"));

  const db = createAdminClient();

  const { data: reward } = await db
    .from("rewards")
    .select("id, name, cost_points, stock")
    .eq("id", rewardId)
    .single();

  if (!reward) redirect("/rewards?error=" + encodeURIComponent("ไม่พบรางวัล"));
  if (reward!.stock <= 0) {
    redirect("/rewards?error=" + encodeURIComponent("รางวัลนี้หมดแล้ว"));
  }

  const { data: ledger } = await db
    .from("points_ledger")
    .select("delta")
    .eq("user_id", user.id);
  const balance = (ledger ?? []).reduce((sum, l) => sum + l.delta, 0);

  if (balance < reward!.cost_points) {
    redirect("/rewards?error=" + encodeURIComponent("แต้มไม่พอสำหรับแลกรางวัลนี้"));
  }

  const { error: redeemError } = await db.from("redemptions").insert({
    user_id: user.id,
    reward_id: reward!.id,
    points_spent: reward!.cost_points,
    status: "pending",
  });
  if (redeemError) redirect("/rewards?error=" + encodeURIComponent(redeemError.message));

  await db.from("points_ledger").insert({
    user_id: user.id,
    delta: -reward!.cost_points,
    reason: "redemption",
    ref_type: "reward",
    ref_id: reward!.id,
  });

  await db.from("rewards").update({ stock: reward!.stock - 1 }).eq("id", reward!.id);

  revalidatePath("/rewards");
  revalidatePath("/dashboard");
  redirect("/rewards?redeemed=1");
}
