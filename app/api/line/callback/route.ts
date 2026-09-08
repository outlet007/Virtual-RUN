import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createSiteUrl } from "@/lib/site-url";
import { getLineLoginConfiguration } from "@/lib/integration-settings";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const cookieStore = await cookies();
  const expectedState = cookieStore.get("line_oauth_state")?.value;

  if (error || !code || !state || state !== expectedState) {
    return NextResponse.redirect(
      createSiteUrl(request, `/admin/settings?error=${encodeURIComponent("เชื่อมต่อ LINE ไม่สำเร็จ")}`),
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(createSiteUrl(request, "/login"));

  const config = await getLineLoginConfiguration();
  if (!config.enabled || !config.configured) {
    return NextResponse.redirect(
      createSiteUrl(
        request,
        `/admin/settings?error=${encodeURIComponent("LINE Login ยังไม่ได้ตั้งค่าหรือถูกปิดใช้งาน")}`,
      ),
    );
  }

  const redirectUri = createSiteUrl(request, "/api/line/callback").toString();

  const tokenRes = await fetch("https://api.line.me/oauth2/v2.1/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: config.channelId,
      client_secret: config.channelSecret,
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(
      createSiteUrl(request, `/admin/settings?error=${encodeURIComponent("เชื่อมต่อ LINE ไม่สำเร็จ")}`),
    );
  }

  const { access_token } = (await tokenRes.json()) as { access_token: string };

  const profileRes = await fetch("https://api.line.me/v2/profile", {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  const profile = (await profileRes.json()) as { userId: string };

  await supabase.from("users").update({ line_user_id: profile.userId }).eq("id", user.id);

  const response = NextResponse.redirect(createSiteUrl(request, "/admin/settings?line=connected"));
  response.cookies.delete("line_oauth_state");
  return response;
}
