import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const visitorCookie = "vr_content_visitor";
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getBangkokDateKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function detectDevice(userAgent: string) {
  if (/bot|crawler|spider|slurp|preview/i.test(userAgent)) return "bot";
  if (/ipad|tablet|kindle|silk/i.test(userAgent)) return "tablet";
  if (/mobile|iphone|ipod|android/i.test(userAgent)) return "mobile";
  return userAgent ? "desktop" : "unknown";
}

function readReferrerHost(request: NextRequest) {
  const referrer = request.headers.get("referer");
  if (!referrer) return "";
  try {
    const url = new URL(referrer);
    return url.host.slice(0, 255);
  } catch {
    return "";
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!uuidPattern.test(id)) {
    return NextResponse.json({ error: "invalid_article" }, { status: 400 });
  }

  const existingVisitor = request.cookies.get(visitorCookie)?.value;
  const visitorId = existingVisitor && uuidPattern.test(existingVisitor)
    ? existingVisitor
    : crypto.randomUUID();
  const db = createAdminClient();
  const { data, error } = await db.rpc("record_content_article_view", {
    p_article_id: id,
    p_visitor_id: visitorId,
    p_view_date: getBangkokDateKey(),
    p_device_type: detectDevice(request.headers.get("user-agent") ?? ""),
    p_referrer_host: readReferrerHost(request),
  });

  if (error) {
    return NextResponse.json({ error: "record_failed" }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "article_not_found" }, { status: 404 });
  }

  const response = new NextResponse(null, { status: 204 });
  if (!existingVisitor) {
    response.cookies.set(visitorCookie, visitorId, {
      httpOnly: true,
      sameSite: "lax",
      secure: (process.env.NEXT_PUBLIC_SITE_URL ?? "").startsWith("https://"),
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
  }
  return response;
}
