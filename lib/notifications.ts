import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { sendLineMessage } from "@/lib/line";
import { isDuplicateNotificationError } from "@/lib/notification-idempotency";

// แจ้งเตือน user ผ่านทุกช่องทางที่เชื่อมไว้ (email/LINE) — ไม่มีช่องทางไหนพังแล้วทำให้ action หลักพังตาม
// เขียนผ่าน service-role client เสมอ (notifications เป็น log ที่ระบบสร้างให้ ไม่ใช่ user เขียนเอง)
export async function notifyUser(
  userId: string,
  type: string,
  { subject, text, dedupeKey }: { subject: string; text: string; dedupeKey: string },
) {
  const db = createAdminClient();

  const { data: user } = await db
    .from("users")
    .select("email, line_user_id")
    .eq("id", userId)
    .single();
  if (!user) return;

  async function deliver(channel: "email" | "line", send: () => Promise<void>) {
    const { data: notification, error } = await db
      .from("notifications")
      .insert({
        user_id: userId,
        channel,
        type,
        status: "queued",
        dedupe_key: dedupeKey,
      })
      .select("id")
      .single();

    if (isDuplicateNotificationError(error) || error || !notification) return;

    let status: "sent" | "failed" = "sent";
    try {
      await send();
    } catch {
      status = "failed";
    }

    await db
      .from("notifications")
      .update({
        status,
        sent_at: status === "sent" ? new Date().toISOString() : null,
      })
      .eq("id", notification.id);
  }

  if (user.email) {
    await deliver("email", () =>
      sendEmail(user.email, subject, text.replace(/\n/g, "<br/>")),
    );
  }

  if (user.line_user_id) {
    await deliver("line", () => sendLineMessage(user.line_user_id, text));
  }
}
