import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createSiteUrl } from "@/lib/site-url";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(
      createSiteUrl(request, `/login?error=${encodeURIComponent("เข้าสู่ระบบไม่สำเร็จ")}`),
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      createSiteUrl(request, `/login?error=${encodeURIComponent("เข้าสู่ระบบไม่สำเร็จ")}`),
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(createSiteUrl(request, "/login"));

  // ผู้ใช้ social login ครั้งแรกยังไม่เคยยอมรับ PDPA (ข้ามฟอร์มสมัครสมาชิกปกติมา) ต้องให้ยอมรับก่อน
  const { data: consent, error: consentError } = await supabase
    .from("consents")
    .select("id")
    .eq("user_id", user.id)
    .eq("type", "privacy")
    .limit(1)
    .maybeSingle();

  if (consentError) {
    console.error("Consent lookup failed after auth callback", {
      code: consentError.code,
      message: consentError.message,
    });
    return NextResponse.redirect(
      createSiteUrl(
        request,
        `/consent?error=${encodeURIComponent("ตรวจสอบข้อมูลการยินยอมไม่สำเร็จ กรุณาลองอีกครั้ง")}`,
      ),
    );
  }

  if (!consent) {
    return NextResponse.redirect(createSiteUrl(request, "/consent"));
  }

  return NextResponse.redirect(createSiteUrl(request, "/dashboard"));
}
