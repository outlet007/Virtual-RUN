import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  PASSWORD_RECOVERY_COOKIE,
  PASSWORD_RECOVERY_MAX_AGE_SECONDS,
} from "@/lib/password-recovery";
import { createSiteUrl } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const supabase = await createClient();

  const result = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type === "recovery"
      ? await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type as EmailOtpType,
        })
      : { error: new Error("Missing recovery token") };

  if (result.error) {
    return NextResponse.redirect(
      createSiteUrl(request, "/reset-password?error=invalid_or_expired"),
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(
      createSiteUrl(request, "/reset-password?error=invalid_or_expired"),
    );
  }

  const resetUrl = createSiteUrl(request, "/reset-password");
  const response = NextResponse.redirect(resetUrl);
  response.cookies.set(PASSWORD_RECOVERY_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: resetUrl.protocol === "https:",
    maxAge: PASSWORD_RECOVERY_MAX_AGE_SECONDS,
    path: "/",
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
