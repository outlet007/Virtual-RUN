"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const province = String(formData.get("province") ?? "").trim();
  const postalCode = String(formData.get("postal_code") ?? "").trim();

  if (!name) redirect("/profile?error=" + encodeURIComponent("กรุณากรอกชื่อ"));
  if (address.length > 500) {
    redirect("/profile?error=" + encodeURIComponent("ที่อยู่ต้องไม่เกิน 500 ตัวอักษร"));
  }
  if (province.length > 100) {
    redirect("/profile?error=" + encodeURIComponent("จังหวัดต้องไม่เกิน 100 ตัวอักษร"));
  }
  if (postalCode && !/^[0-9]{5}$/.test(postalCode)) {
    redirect("/profile?error=" + encodeURIComponent("รหัสไปรษณีย์ต้องเป็นตัวเลข 5 หลัก"));
  }

  const update: Record<string, unknown> = {
    name,
    phone: phone || null,
    address: address || null,
    province: province || null,
    postal_code: postalCode || null,
  };

  // เก็บที่ path คงที่ต่อ user ({user.id}/avatar.ext) แล้ว upsert ทับของเดิม — ไม่ต้องมาคอย track/ลบไฟล์เก่าเอง
  const avatarFile = formData.get("avatar_file");
  if (avatarFile instanceof File && avatarFile.size > 0) {
    const ext = avatarFile.type.split("/")[1] ?? "jpg";
    const path = `${user.id}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("user-avatars")
      .upload(path, avatarFile, { contentType: avatarFile.type, upsert: true });
    if (uploadError) redirect("/profile?error=" + encodeURIComponent(uploadError.message));
    update.avatar_url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/user-avatars/${path}`;
  }

  // RLS + column grant จำกัดให้ user แก้ไขได้เฉพาะข้อมูลโปรไฟล์ของแถวตัวเอง
  // (ดู 0002_admin_role.sql, 0013_user_avatars.sql และ migration ข้อมูลที่อยู่)
  const { error } = await supabase.from("users").update(update).eq("id", user.id);

  if (error) redirect("/profile?error=" + encodeURIComponent(error.message));

  revalidatePath("/profile");
  redirect("/profile?saved=1");
}

export async function changePassword(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");

  if (password.length < 6) {
    redirect("/profile?error=" + encodeURIComponent("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"));
  }
  if (password !== confirmPassword) {
    redirect("/profile?error=" + encodeURIComponent("ยืนยันรหัสผ่านไม่ตรงกัน"));
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect("/profile?error=" + encodeURIComponent(error.message));

  redirect("/profile?password_changed=1");
}
