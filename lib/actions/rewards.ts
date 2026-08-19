"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const REDEEM_ERROR_MESSAGES: Record<string, string> = {
  not_authenticated: "กรุณาเข้าสู่ระบบ",
  reward_not_found: "ไม่พบรางวัล",
  out_of_stock: "รางวัลนี้หมดแล้ว",
  insufficient_points: "แต้มไม่พอสำหรับแลกรางวัลนี้",
};

export async function redeemReward(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const rewardId = String(formData.get("reward_id") ?? "");
  if (!rewardId) redirect("/dashboard/rewards?error=" + encodeURIComponent("ไม่พบรางวัล"));

  // ต้องกรอกที่อยู่ให้ครบก่อนแลกของ เพราะรางวัลส่วนใหญ่เป็นของจริงที่ต้องจัดส่ง
  // เช็คซ้ำที่ฝั่ง server เสมอ (ไม่พึ่ง UI อย่างเดียว) กันกรณี submit ตรงข้าม endpoint
  const { data: profile } = await supabase
    .from("users")
    .select("address, province, postal_code")
    .eq("id", user.id)
    .single();
  const hasCompleteAddress = Boolean(
    profile?.address?.trim() && profile?.province?.trim() && profile?.postal_code?.trim(),
  );
  if (!hasCompleteAddress) {
    redirect(
      "/dashboard/rewards?error=" +
        encodeURIComponent("กรุณากรอกข้อมูลที่อยู่ในหน้าโปรไฟล์ให้ครบถ้วนก่อนแลกรางวัล"),
    );
  }

  // ทำทุกอย่าง (เช็ค stock/แต้ม + insert redemption/ledger + ลด stock) ใน Postgres function
  // เดียวกันแบบ atomic กัน race condition ตอนสอง request แลกของพร้อมกัน (ดู 0007_redeem_reward_function.sql)
  const { error } = await supabase.rpc("redeem_reward", { p_reward_id: rewardId });

  if (error) {
    const message = REDEEM_ERROR_MESSAGES[error.message] ?? error.message;
    redirect("/dashboard/rewards?error=" + encodeURIComponent(message));
  }

  revalidatePath("/rewards");
  revalidatePath("/dashboard/rewards");
  revalidatePath("/dashboard");
  redirect("/dashboard/rewards?redeemed=1");
}
