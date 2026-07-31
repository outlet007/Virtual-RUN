import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login?next=/admin/settings", request.url));

  const state = crypto.randomUUID();
  const redirectUri = new URL("/api/strava/callback", request.url).toString();

  const authorizeUrl = new URL("https://www.strava.com/oauth/authorize");
  authorizeUrl.searchParams.set("client_id", process.env.STRAVA_CLIENT_ID ?? "");
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
