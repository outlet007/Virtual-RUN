"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getRegistrationErrorMessage } from "@/lib/registration-errors";

export async function registerForEvent(formData: FormData) {
  const packageId = String(formData.get("package_id") ?? "");
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // ใช้ event_id สำหรับ redirect เท่านั้น; RPC จะตรวจแพ็กเกจ ราคา และสถานะงานซ้ำใน transaction
  const { data: pkg } = await supabase
    .from("packages")
    .select("event_id")
    .eq("id", packageId)
    .single();
  if (!pkg) redirect("/?error=" + encodeURIComponent("ไม่พบแพ็กเกจ"));

  const shipping = {
    recipient: String(formData.get("recipient") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    address: String(formData.get("address") ?? ""),
    province: String(formData.get("province") ?? ""),
    postal_code: String(formData.get("postal_code") ?? ""),
  };

  const result = await supabase
    .rpc("register_for_event", {
      p_package_id: packageId,
      p_shipping_address: shipping,
    })
    .single();

  if (result.error) {
    const msg = getRegistrationErrorMessage(result.error);
    redirect(`/events/${pkg.event_id}?error=${encodeURIComponent(msg)}`);
  }

  const registration = result.data as {
    registration_id: string;
    requires_payment: boolean;
  } | null;
  if (!registration) redirect("/?error=" + encodeURIComponent("ไม่สามารถสร้างใบสมัครได้"));

  revalidatePath("/dashboard");

  if (!registration.requires_payment) {
    redirect("/dashboard?welcome=1");
  }

  redirect(`/dashboard/pay/${registration.registration_id}`);
}
