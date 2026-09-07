import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  isInvalidRefreshTokenError,
  isSupabaseAuthCookieName,
} from "@/lib/supabase/auth-errors";
import { SUPABASE_AUTH_COOKIE_NAME } from "@/lib/supabase/auth-cookie";

function expireSupabaseAuthCookie(
  response: NextResponse,
  request: NextRequest,
  name: string,
) {
  response.cookies.set(name, "", {
    httpOnly: false,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
  });
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    // SUPABASE_URL (server-only) ให้ override ได้ตอนรันใน Docker — ฝั่ง container
    // ต้องเรียก Supabase ผ่าน host.docker.internal ไม่ใช่ 127.0.0.1 แบบฝั่ง browser
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: { name: SUPABASE_AUTH_COOKIE_NAME },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[],
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refresh the session if it is expired. A restored/recreated Auth database can
  // leave browsers with refresh-token cookies that no longer exist server-side.
  // Treat only that permanent 400 as a signed-out session; a retryable 502 must
  // not destroy a valid session.
  let authError: unknown = null;
  try {
    const { error } = await supabase.auth.getUser();
    authError = error;
  } catch (error) {
    authError = error;
  }

  if (isInvalidRefreshTokenError(authError)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set(
      "error",
      "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่",
    );

    const expiredSessionResponse = NextResponse.redirect(loginUrl);
    for (const cookie of request.cookies.getAll()) {
      if (!isSupabaseAuthCookieName(cookie.name)) continue;
      expireSupabaseAuthCookie(expiredSessionResponse, request, cookie.name);
    }
    expiredSessionResponse.headers.set("Cache-Control", "private, no-store");
    return expiredSessionResponse;
  }

  let expiredLegacyCookie = false;
  for (const cookie of request.cookies.getAll()) {
    if (
      isSupabaseAuthCookieName(cookie.name) &&
      !cookie.name.startsWith(SUPABASE_AUTH_COOKIE_NAME)
    ) {
      expireSupabaseAuthCookie(response, request, cookie.name);
      expiredLegacyCookie = true;
    }
  }
  if (expiredLegacyCookie) {
    response.headers.set("Cache-Control", "private, no-store");
  }

  return response;
}
