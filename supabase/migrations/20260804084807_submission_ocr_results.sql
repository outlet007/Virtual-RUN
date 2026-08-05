-- เก็บผลตรวจหลักฐานด้วย Tesseract OCR เพื่อ audit และแสดงให้เจ้าหน้าที่เทียบกับค่าที่ผู้ใช้กรอก
alter table public.submissions
  add column ocr_status text not null default 'not_processed'
    check (ocr_status in ('not_processed', 'matched', 'mismatch', 'unreadable', 'error')),
  add column ocr_distance_km numeric(6,2)
    check (ocr_distance_km is null or ocr_distance_km > 0),
  add column ocr_confidence numeric(5,2)
    check (ocr_confidence is null or (ocr_confidence >= 0 and ocr_confidence <= 100)),
  add column ocr_raw_text text,
  add column ocr_processed_at timestamptz,
  add column evidence_sha256 text;

-- ภาพหลักฐานเดียวกันห้ามนำมาส่งซ้ำในบัญชีเดียวกัน
create unique index submissions_user_evidence_sha256_key
  on public.submissions (user_id, evidence_sha256)
  where evidence_sha256 is not null;

-- การตัดสินผล OCR/status ต้องทำใน server action เท่านั้น
-- ปิดการ insert ตรงจาก authenticated Data API เพื่อกันผู้ใช้ปลอม status=approved
revoke insert on public.submissions from authenticated;
