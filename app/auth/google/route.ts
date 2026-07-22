import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const redirectTo = new URL("/auth/callback", request.url).toString();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });

  if (error || !data.url) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent("เข้าสู่ระบบด้วย Google ไม่สำเร็จ")}`, request.url),
    );
  }

  return NextResponse.redirect(data.url);
}
