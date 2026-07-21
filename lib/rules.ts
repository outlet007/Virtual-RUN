// Rule engine เวอร์ชันเริ่มต้น — ตรวจ pace คร่าวๆ ใช้ทั้งจากอัปโหลดเองและ sync จาก Strava
// pace ที่มนุษย์ทำได้ ~ 2:30/km (150s) ถึง ~ 15:00/km (900s สำหรับเดิน)
export function basicRuleCheck(distanceKm: number, durationSec: number | null) {
  if (!durationSec || durationSec <= 0) return "flagged"; // ไม่มีเวลา → ให้ admin ดู
  const pace = durationSec / distanceKm; // วินาที/กม.
  if (pace < 150 || pace > 1200) return "flagged";
  return "approved";
}
