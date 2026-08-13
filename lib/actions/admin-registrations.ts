"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyUser } from "@/lib/notifications";

export async function manuallyApproveRegistration(formData: FormData) {
  await requireAdmin();
  const registrationId = String(formData.get("registration_id") ?? "");
  const eventId = String(formData.get("event_id") ?? "");
  const returnPath = /^[0-9a-f-]{36}$/i.test(eventId)
    ? `/admin/events/${eventId}?tab=registrations`
    : "/admin/registrations";
  const redirectWith = (key: string, value: string): never => {
    const separator = returnPath.includes("?") ? "&" : "?";
    redirect(`${returnPath}${separator}${key}=${encodeURIComponent(value)}`);
  };

  if (!registrationId) {
    return redirectWith("error", "ไม่พบผู้สมัคร");
  }

  const db = createAdminClient();
  const { data: registration, error } = await db
    .from("registrations")
    .update({ status: "confirmed" })
    .eq("id", registrationId)
    .eq("status", "pending")
    .select("user_id, bib_number")
    .maybeSingle();

  if (error) {
    return redirectWith("error", error.message);
  }
  if (!registration) {
    return redirectWith("error", "ผู้สมัครนี้ไม่ได้อยู่ในสถานะรอดำเนินการ");
  }

  await notifyUser(registration.user_id, "registration_confirmed", {
    dedupeKey: `registration:${registrationId}:confirmed`,
    subject: "ยืนยันการสมัครเรียบร้อยแล้ว",
    text: `การสมัครของคุณได้รับการยืนยันแล้ว หมายเลข BIB คือ ${registration.bib_number}`,
  });

  revalidatePath("/admin/registrations");
  if (eventId) revalidatePath(`/admin/events/${eventId}`);
  revalidatePath("/admin/payments");
  revalidatePath("/dashboard");
  redirectWith(eventId ? "registration_approved" : "approved", "1");
}
