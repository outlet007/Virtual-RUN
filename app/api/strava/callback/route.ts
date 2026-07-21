import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { exchangeCodeForToken, listActivities } from "@/lib/strava/api";
import { syncActivityForUser } from "@/lib/strava/sync";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const cookieStore = await cookies();
  const expectedState = cookieStore.get("strava_oauth_state")?.value;

  if (error || !code || !state || state !== expectedState) {
    return NextResponse.redirect(
      new URL(
        `/dashboard?error=${encodeURIComponent("เชื่อมต่อ Strava ไม่สำเร็จ")}`,
        request.url,
      ),
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const token = await exchangeCodeForToken(code);

  await supabase.from("strava_connections").upsert(
    {
      user_id: user.id,
      strava_athlete_id: token.athlete ? String(token.athlete.id) : null,
      access_token: token.access_token,
      refresh_token: token.refresh_token,
      token_expires_at: new Date(token.expires_at * 1000).toISOString(),
    },
    { onConflict: "user_id" },
  );

  // initial import: ดึงกิจกรรมย้อนหลังนับจากวันเริ่มงานของใบสมัคร confirmed ที่เก่าสุด
  // ถ้าไม่มีใบสมัคร confirmed เลย ก็ไม่มีอะไรให้จับคู่ ข้ามการ import
  const db = createAdminClient();
  const { data: regs } = await db
    .from("registrations")
    .select("events(start_date)")
    .eq("user_id", user.id)
    .eq("status", "confirmed");

  type RegWithEvent = { events: { start_date: string } | { start_date: string }[] | null };
  const startDates = ((regs ?? []) as unknown as RegWithEvent[])
    .map((r) => (Array.isArray(r.events) ? r.events[0]?.start_date : r.events?.start_date))
    .filter((d): d is string => Boolean(d));

  if (startDates.length > 0) {
    const earliest = startDates.sort()[0];
    const afterEpoch = Math.floor(new Date(earliest).getTime() / 1000);
    const activities = await listActivities(token.access_token, afterEpoch);
    for (const activity of activities) {
      await syncActivityForUser(user.id, activity);
    }
  }

  const response = NextResponse.redirect(new URL("/dashboard?strava=connected", request.url));
  response.cookies.delete("strava_oauth_state");
  return response;
}
