import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActivity } from "@/lib/strava/api";
import { getValidAccessToken, syncActivityForUser } from "@/lib/strava/sync";

// Strava ยิง GET ครั้งเดียวตอน subscribe เพื่อยืนยันว่า endpoint นี้เป็นของจริง (one-time handshake)
export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.STRAVA_WEBHOOK_VERIFY_TOKEN && challenge) {
    return NextResponse.json({ "hub.challenge": challenge });
  }
  return NextResponse.json({ error: "invalid verify token" }, { status: 403 });
}

type StravaWebhookEvent = {
  aspect_type: "create" | "update" | "delete";
  object_id: number;
  object_type: "activity" | "athlete";
  owner_id: number;
  updates?: Record<string, string>;
};

// Strava ต้องได้ 200 กลับไปไว (ภายใน 2 วิ) ไม่งั้นจะ retry/ปิด subscription
// สเกลเล็กแบบนี้ประมวลผลแบบ sync ได้เลย ยังไม่ต้องมี queue
export async function POST(request: Request) {
  const event = (await request.json()) as StravaWebhookEvent;
  const db = createAdminClient();

  try {
    if (event.object_type === "athlete" && event.updates?.authorized === "false") {
      // user ถอนสิทธิ์จากฝั่ง Strava เอง — ลบ connection ทิ้ง
      await db
        .from("strava_connections")
        .delete()
        .eq("strava_athlete_id", String(event.owner_id));
      return NextResponse.json({ ok: true });
    }

    // เฉพาะกิจกรรมใหม่เท่านั้นในเฟสนี้ — update/delete ของ Strava ยังไม่รองรับ (ตัดสโคปตั้งใจ)
    if (event.object_type === "activity" && event.aspect_type === "create") {
      const { data: connection } = await db
        .from("strava_connections")
        .select("id, user_id, access_token, refresh_token, token_expires_at")
        .eq("strava_athlete_id", String(event.owner_id))
        .maybeSingle();

      if (connection) {
        const accessToken = await getValidAccessToken(connection);
        const activity = await getActivity(event.object_id, accessToken);
        await syncActivityForUser(connection.user_id, activity);
      }
    }
  } catch {
    // ไม่ throw ต่อ — ต้องตอบ 200 เสมอไม่งั้น Strava จะ retry ซ้ำๆ จนปิด subscription
  }

  return NextResponse.json({ ok: true });
}
