"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSuperAdmin } from "@/lib/auth/admin";
import { sendEmail } from "@/lib/email";
import { isValidSmtpEmail, validateSmtpInput } from "@/lib/smtp-configuration";
import { saveSmtpSettings } from "@/lib/smtp-settings";

function settingsError(message: string): never {
  redirect(`/admin/settings?error=${encodeURIComponent(message)}#smtp-settings`);
}

export async function updateSmtpSettings(formData: FormData) {
  const { user } = await requireSuperAdmin();
  const input = {
    enabled: formData.get("smtp_enabled") === "on",
    host: String(formData.get("smtp_host") ?? "").trim(),
    port: Number(formData.get("smtp_port")),
    secure: formData.get("smtp_secure") === "on",
    username: String(formData.get("smtp_username") ?? "").trim(),
    password: String(formData.get("smtp_password") ?? ""),
    clearPassword: formData.get("smtp_clear_password") === "on",
    fromName: String(formData.get("smtp_from_name") ?? "").trim(),
    fromEmail: String(formData.get("smtp_from_email") ?? "").trim().toLowerCase(),
    updatedBy: user.id,
  };

  const validationError = validateSmtpInput(input);
  if (validationError) settingsError(validationError);

  try {
    await saveSmtpSettings(input);
  } catch (error) {
    console.error("Unable to save SMTP settings", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
    settingsError("บันทึก SMTP ไม่สำเร็จ กรุณาตรวจ migration และ encryption key");
  }

  revalidatePath("/admin/settings");
  redirect("/admin/settings?smtp_saved=1#smtp-settings");
}

export async function testSmtpSettings(formData: FormData) {
  await requireSuperAdmin();
  const recipient = String(formData.get("smtp_test_email") ?? "").trim().toLowerCase();
  if (!isValidSmtpEmail(recipient)) settingsError("กรุณากรอกอีเมลทดสอบให้ถูกต้อง");

  try {
    await sendEmail(
      recipient,
      "Virtual RUN SMTP test",
      "<p>การตั้งค่า SMTP ของ Virtual RUN ส่งอีเมลทดสอบสำเร็จแล้ว</p>",
    );
  } catch (error) {
    console.error("SMTP test failed", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
    settingsError("ส่งอีเมลทดสอบไม่สำเร็จ กรุณาตรวจค่าการเชื่อมต่อและ log ของ server");
  }

  redirect("/admin/settings?smtp_test=sent#smtp-settings");
}
