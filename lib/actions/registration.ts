"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function genBib() {
  return "VR" + Math.floor(100000 + Math.random() * 900000).toString();
}

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
  const isFree = Number(pkg.price) === 0;

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
  } else {
    // Phase 4: ไปหน้าชำระเงิน PromptPay
    redirect(`/dashboard?pending=${reg!.id}`);
  }
}
