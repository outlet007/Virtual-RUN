import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent("เข้าสู่ระบบไม่สำเร็จ")}`, request.url),
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent("เข้าสู่ระบบไม่สำเร็จ")}`, request.url),
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  // ผู้ใช้ social login ครั้งแรกยังไม่เคยยอมรับ PDPA (ข้ามฟอร์มสมัครสมาชิกปกติมา) ต้องให้ยอมรับก่อน
  const { data: consent } = await supabase
    .from("consents")
    .select("id")
    .eq("user_id", user.id)
    .eq("type", "privacy")
    .maybeSingle();

  if (!consent) {
    return NextResponse.redirect(new URL("/consent", request.url));
  }

  return NextResponse.redirect(new URL("/dashboard", request.url));
}
