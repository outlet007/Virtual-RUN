import type { EventAudience } from "@/lib/event-audience";

// สีพื้นป้ายกลุ่มผู้สมัคร (ใช้ร่วมกันในการ์ดหน้าแรก หน้ารายละเอียดงาน และการ์ดหน้า Admin)
// อยู่ใน components/ เพราะ Tailwind สร้าง class แบบ arbitrary เฉพาะจากไฟล์ใน app/ และ components/
export const eventAudienceBadgeClass: Record<Exclude<EventAudience, "all">, string> = {
  staff: "bg-[#FF4A00]",
  student: "bg-[rgb(0,112,230)]",
  staff_student: "bg-[rgb(141,37,255)]",
};
