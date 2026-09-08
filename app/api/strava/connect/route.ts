import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createSiteUrl } from "@/lib/site-url";
import { getStravaConfiguration } from "@/lib/integration-settings";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(createSiteUrl(request, "/login?next=/admin/settings"));

  const config = await getStravaConfiguration();
  if (!config.enabled || !config.configured) {
    return NextResponse.redirect(
      createSiteUrl(
        request,
        `/admin/settings?error=${encodeURIComponent("Strava ยังไม่ได้ตั้งค่าหรือถูกปิดใช้งาน")}`,
      ),
    );
  }

  const state = crypto.randomUUID();
  const redirectUri = createSiteUrl(request, "/api/strava/callback").toString();

  const authorizeUrl = new URL("https://www.strava.com/oauth/authorize");
  authorizeUrl.searchParams.set("client_id", config.clientId);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("approval_prompt", "auto");
  authorizeUrl.searchParams.set("scope", "activity:read_all");
  authorizeUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set("strava_oauth_state", state, {
    httpOnly: true,
    maxAge: 600, // 10 นาทีพอสำหรับ OAuth round-trip
    sameSite: "lax",
    path: "/",
  });
  return response;
}
