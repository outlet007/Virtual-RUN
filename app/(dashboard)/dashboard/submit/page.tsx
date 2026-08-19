import { redirect } from "next/navigation";

// หน้ารวมเลือกงานก่อนบันทึกผลถูกยกเลิกแล้ว — ตอนนี้ต้องเลือกงานจากหน้า "งานของฉัน" ก่อนเสมอ
// (ปุ่มบันทึกผลของแต่ละงานจะพาไปที่ /dashboard/submit/[registrationId] ตรงๆ)
// เก็บ route นี้ไว้เป็น fallback เผื่อมี bookmark หรือลิงก์เก่าที่ยังชี้มาที่นี่
export default function LegacySubmitPage() {
  redirect("/dashboard/events");
}
