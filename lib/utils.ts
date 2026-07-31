import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatKm(km: number) {
  return km.toLocaleString("en-US", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

export function formatBaht(amount: number) {
  return amount.toLocaleString("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 0,
  });
}

export function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function genBib() {
  return "VR" + Math.floor(100000 + Math.random() * 900000).toString();
}

// Level/XP เป็นค่าที่คำนวณจากแต้มสะสม (points_ledger) ไม่ใช่คอลัมน์ใหม่ — 1000 แต้ม/เลเวล เป็นค่าคงที่กำหนดเอง
const XP_PER_LEVEL = 1000;
export function getLevelProgress(points: number) {
  const level = Math.floor(points / XP_PER_LEVEL) + 1;
  const currentXp = points % XP_PER_LEVEL;
  return { level, currentXp, xpPerLevel: XP_PER_LEVEL };
}

// สำหรับ preview รายละเอียดงาน (เก็บเป็น HTML จาก RichTextEditor) แบบข้อความล้วนบน card/list
export function stripHtml(html: string) {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}
