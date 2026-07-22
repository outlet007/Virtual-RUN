import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { sendLineMessage } from "@/lib/line";

// แจ้งเตือน user ผ่านทุกช่องทางที่เชื่อมไว้ (email/LINE) — ไม่มีช่องทางไหนพังแล้วทำให้ action หลักพังตาม
// เขียนผ่าน service-role client เสมอ (notifications เป็น log ที่ระบบสร้างให้ ไม่ใช่ user เขียนเอง)
export async function notifyUser(
  userId: string,
  type: string,
  { subject, text }: { subject: string; text: string },
) {
  const db = createAdminClient();

  const { data: user } = await db
    .from("users")
    .select("email, line_user_id")
    .eq("id", userId)
    .single();
  if (!user) return;

  if (user.email) {
    let status: "sent" | "failed" = "sent";
    try {
      await sendEmail(user.email, subject, text.replace(/\n/g, "<br/>"));
    } catch {
      status = "failed";
    }
    await db.from("notifications").insert({
      user_id: userId,
      channel: "email",
      type,
      status,
      sent_at: status === "sent" ? new Date().toISOString() : null,
    });
  }

  if (user.line_user_id) {
    let status: "sent" | "failed" = "sent";
    try {
      await sendLineMessage(user.line_user_id, text);
    } catch {
      status = "failed";
    }
    await db.from("notifications").insert({
      user_id: userId,
      channel: "line",
      type,
      status,
      sent_at: status === "sent" ? new Date().toISOString() : null,
    });
  }
}
