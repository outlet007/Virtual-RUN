import "server-only";

import { getLineMessagingConfiguration } from "@/lib/integration-settings";

// LINE Messaging API ใช้ channel access token ตัวเดียวของแอป (ไม่ใช่ token ต่อ user แบบ Strava)
// ส่งหาใครก็ได้ที่รู้ line_user_id + เคยเพิ่มเพื่อน OA แล้วเท่านั้น
export async function sendLineMessage(lineUserId: string, text: string) {
  const config = await getLineMessagingConfiguration();
  if (!config.enabled || !config.configured) {
    throw new Error("LINE Messaging integration is not configured");
  }
  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.channelAccessToken}`,
    },
    body: JSON.stringify({
      to: lineUserId,
      messages: [{ type: "text", text }],
    }),
  });

  if (!res.ok) {
    throw new Error(`LINE push failed: ${res.status} ${await res.text()}`);
  }
}
