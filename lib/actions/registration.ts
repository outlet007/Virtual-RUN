"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { genBib } from "@/lib/utils";

export async function registerForEvent(formData: FormData) {
  const packageId = String(formData.get("package_id") ?? "");
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // ดึงข้อมูลแพ็กเกจ + งาน
  const { data: pkg } = await supabase
    .from("packages")
    .select("id, event_id, price, has_physical_medal, events(pricing)")
    .eq("id", packageId)
    .single();

  if (!pkg) {
    redirect("/?error=" + encodeURIComponent("ไม่พบแพ็กเกจ"));
  }

  // ที่อยู่จัดส่ง (เฉพาะแพ็กเกจที่มีเหรียญกายภาพ)
  let shipping = null;
  if (pkg.has_physical_medal) {
    shipping = {
      recipient: String(formData.get("recipient") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      address: String(formData.get("address") ?? ""),
      province: String(formData.get("province") ?? ""),
      postal_code: String(formData.get("postal_code") ?? ""),
    };
  }

  // งานฟรี → confirmed ทันที + ออก BIB | งานเสียเงิน → pending (Phase 4 ต่อ payment)
  const eventPricing = pkg.events[0]?.pricing;
  const isFree = eventPricing === "free" || Number(pkg.price) === 0;

  const { data: reg, error } = await supabase
    .from("registrations")
    .insert({
      user_id: user.id,
      package_id: pkg.id,
      event_id: pkg.event_id,
      shipping_address: shipping,
      bib_number: isFree ? genBib() : null,
      status: isFree ? "confirmed" : "pending",
    })
    .select("id")
    .single();

  if (error) {
    const msg =
      error.code === "23505"
        ? "คุณลงทะเบียนแพ็กเกจนี้ไปแล้ว"
        : error.message;
    redirect(`/events/${pkg.event_id}?error=${encodeURIComponent(msg)}`);
  }

  revalidatePath("/dashboard");

  if (isFree) {
    redirect("/dashboard?welcome=1");
  }

  // งานเสียเงิน → สร้างรายการชำระเงินรอ admin ยืนยัน (gen QR เอง ไม่มี payment gateway)
  await supabase.from("payments").insert({
    registration_id: reg!.id,
    amount: pkg.price,
    method: "promptpay",
    status: "pending",
    charge_ref: `VR-${reg!.id.slice(0, 8)}`,
  });

  redirect(`/dashboard/pay/${reg!.id}`);
}
