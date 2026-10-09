"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const REDEEM_ERROR_MESSAGES: Record<string, string> = {
  not_authenticated: "กรุณาเข้าสู่ระบบ",
  reward_not_found: "ไม่พบรางวัล",
  out_of_stock: "รางวัลนี้หมดแล้ว",
  insufficient_points: "แต้มไม่พอสำหรับแลกรางวัลนี้",
  invalid_fulfillment_method: 'กรุณาเลือกวิธีรับรางวัล',
  fulfillment_method_not_available: 'รางวัลนี้ไม่รองรับวิธีรับที่เลือก',
  pickup_location_not_available: 'สถานที่รับรางวัลไม่พร้อมใช้งาน',
  shipping_address_required: 'กรุณากรอกที่อยู่ในหน้าโปรไฟล์ให้ครบก่อนเลือกจัดส่ง',
};

export async function redeemReward(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const rewardId = String(formData.get("reward_id") ?? "");
  if (!rewardId) redirect("/dashboard/rewards?error=" + encodeURIComponent("ไม่พบรางวัล"));
  const fulfillmentMethod = String(formData.get('fulfillment_method') ?? '');

  // ทำทุกอย่าง (เช็ค stock/แต้ม + insert redemption/ledger + ลด stock) ใน Postgres function
  // เดียวกันแบบ atomic กัน race condition ตอนสอง request แลกของพร้อมกัน (ดู 0007_redeem_reward_function.sql)
  const { error } = await supabase.rpc('redeem_reward', {
    p_reward_id: rewardId,
    p_fulfillment_method: fulfillmentMethod,
  });

  if (error) {
    const message = REDEEM_ERROR_MESSAGES[error.message] ?? error.message;
    redirect("/dashboard/rewards?error=" + encodeURIComponent(message));
  }

  revalidatePath("/rewards");
  revalidatePath("/dashboard/rewards");
  revalidatePath("/dashboard");
  redirect("/dashboard/rewards?redeemed=1");
}
