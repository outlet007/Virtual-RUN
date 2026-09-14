"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { verifyTurnstileToken } from "@/lib/turnstile";

const POLICY_VERSION = "2026-01";

export async function signUp(formData: FormData) {
  const name = String(formData.get("name") ?? "");
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const acceptPrivacy = formData.get("privacy") === "on";
  const acceptMarketing = formData.get("marketing") === "on";

  if (!acceptPrivacy) {
    redirect("/signup?error=" + encodeURIComponent("ต้องยอมรับนโยบายความเป็นส่วนตัว"));
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });

  if (error) {
    redirect("/signup?error=" + encodeURIComponent(error.message));
  }

  // บันทึกความยินยอม PDPA (ต้องมี session — dev: ปิด email confirmation ใน Supabase Auth)
  if (data.user) {
    const consents = [
      { user_id: data.user.id, policy_version: POLICY_VERSION, type: "privacy" },
      { user_id: data.user.id, policy_version: POLICY_VERSION, type: "terms" },
    ];
    if (acceptMarketing) {
      consents.push({
        user_id: data.user.id,
        policy_version: POLICY_VERSION,
        type: "marketing",
      });
    }
    await supabase.from("consents").insert(consents);
  }

  redirect("/dashboard");
}

// สำหรับ user ที่ social login ครั้งแรก (ข้ามฟอร์มสมัครสมาชิกปกติที่มี checkbox PDPA มา)
export async function acceptConsent(formData: FormData) {
  const accepted = formData.get("accept") === "on";
  if (!accepted) {
    redirect("/consent?error=" + encodeURIComponent("ต้องยอมรับการยินยอมเปิดเผยข้อมูลก่อน"));
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error: consentError } = await supabase.from("consents").insert([
    { user_id: user.id, policy_version: POLICY_VERSION, type: "privacy" },
    { user_id: user.id, policy_version: POLICY_VERSION, type: "terms" },
  ]);

  if (consentError) {
    console.error("Consent insert failed", {
      code: consentError.code,
      message: consentError.message,
    });
    redirect(
      "/consent?error=" +
        encodeURIComponent("บันทึกข้อมูลการยินยอมไม่สำเร็จ กรุณาลองอีกครั้ง"),
    );
  }

  redirect("/dashboard");
}

export async function logIn(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const turnstileToken = String(formData.get("cf-turnstile-response") ?? "");

  if (!(await verifyTurnstileToken(turnstileToken))) {
    redirect(
      "/login?error=" +
        encodeURIComponent("กรุณายืนยันการตรวจสอบความปลอดภัยแล้วลองใหม่"),
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect("/login?error=" + encodeURIComponent("อีเมลหรือรหัสผ่านไม่ถูกต้อง"));
  }
  redirect("/dashboard");
}
