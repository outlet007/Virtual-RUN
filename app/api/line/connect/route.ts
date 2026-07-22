import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login?next=/dashboard", request.url));

  const state = crypto.randomUUID();
  const redirectUri = new URL("/api/line/callback", request.url).toString();

  const authorizeUrl = new URL("https://access.line.me/oauth2/v2.1/authorize");
  authorizeUrl.searchParams.set("client_id", process.env.LINE_LOGIN_CHANNEL_ID ?? "");
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("scope", "profile");
  authorizeUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set("line_oauth_state", state, {
    httpOnly: true,
    maxAge: 600, // 10 นาทีพอสำหรับ OAuth round-trip
    sameSite: "lax",
    path: "/",
  });
  return response;
}
