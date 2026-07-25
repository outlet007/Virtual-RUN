-- ============================================================
-- เพิ่มรูป poster ของงาน (events.poster_image) แยกจาก cover_image (banner)
-- ใช้แสดงในคอลัมน์ซ้ายของหน้ารายละเอียด event สาธารณะ
-- ============================================================

alter table public.events
  add column poster_image text;
