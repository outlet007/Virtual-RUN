-- ============================================================
-- Screenshot upload สำหรับหลักฐานผลวิ่ง (manual review เป็นทางหลัก)
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('run-evidence', 'run-evidence', false, 5242880, array['image/png','image/jpeg','image/webp','image/heic'])
on conflict (id) do nothing;

-- แต่ละ user อัปโหลด/อ่านได้เฉพาะโฟลเดอร์ของตัวเอง (path: {user_id}/{filename})
create policy "own evidence insert" on storage.objects for insert
  with check (bucket_id = 'run-evidence' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "own evidence read" on storage.objects for select
  using (bucket_id = 'run-evidence' and (storage.foldername(name))[1] = auth.uid()::text);

-- admin อ่านได้ทุกไฟล์ผ่าน service-role client อยู่แล้ว (ข้าม RLS เหมือน table ปกติ) ไม่ต้องเพิ่ม policy
