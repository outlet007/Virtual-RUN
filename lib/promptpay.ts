import generatePayload from "promptpay-qr";
import QRCode from "qrcode";

// gen PromptPay QR เอง (EMV QR spec ของ ธปท.) — ไม่มี webhook แจ้งจ่ายอัตโนมัติ
// admin ต้องเข้าไปกดยืนยันเองที่ /admin/payments หลังเช็คยอดเงินเข้าจริง
export async function generatePromptPayQrDataUrl(amount: number): Promise<string> {
  const promptPayId = process.env.PROMPTPAY_ID ?? "";
  const payload = generatePayload(promptPayId, { amount });
  return QRCode.toDataURL(payload, { width: 320, margin: 1 });
}
