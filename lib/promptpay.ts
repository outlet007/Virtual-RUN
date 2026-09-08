import "server-only";

import generatePayload from "promptpay-qr";
import QRCode from "qrcode";
import { getPromptPayConfiguration } from "@/lib/integration-settings";

// gen PromptPay QR เอง (EMV QR spec ของ ธปท.) — ไม่มี webhook แจ้งจ่ายอัตโนมัติ
// admin ต้องเข้าไปกดยืนยันเองที่ /admin/payments หลังเช็คยอดเงินเข้าจริง
export async function generatePromptPayQrDataUrl(amount: number): Promise<string> {
  const config = await getPromptPayConfiguration();
  if (!config.enabled || !config.configured) {
    throw new Error("PromptPay is not configured");
  }
  const payload = generatePayload(config.promptPayId, { amount });
  return QRCode.toDataURL(payload, { width: 320, margin: 1 });
}
