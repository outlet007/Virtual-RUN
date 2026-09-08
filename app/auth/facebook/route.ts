import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createSiteUrl } from "@/lib/site-url";
import { getSocialLoginVisibility } from "@/lib/integration-settings";

export async function GET(request: Request) {
  const visibility = await getSocialLoginVisibility();
  if (!visibility.facebook) {
    return NextResponse.redirect(
      createSiteUrl(
        request,
        `/login?error=${encodeURIComponent("Facebook Login ถูกปิดใช้งาน")}`,
      ),
    );
  }
  const supabase = await createClient();
  const redirectTo = createSiteUrl(request, "/auth/callback").toString();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "facebook",
    options: { redirectTo },
  });

  if (error || !data.url) {
    return NextResponse.redirect(
      createSiteUrl(request, `/login?error=${encodeURIComponent("เข้าสู่ระบบด้วย Facebook ไม่สำเร็จ")}`),
    );
  }

  return NextResponse.redirect(data.url);
}
