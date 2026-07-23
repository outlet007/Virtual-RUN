-- ============================================================
-- เปลี่ยนรูปปกงาน (events.cover_image) และรูปเหรียญ (medals.image_url)
-- จากช่องกรอกลิงก์ URL เอง เป็นอัปโหลดไฟล์จริงเก็บใน Supabase Storage
-- ============================================================

-- bucket แบบ public เพราะรูปปกงาน/รูปเหรียญต้องโชว์ในหน้าเว็บสาธารณะ (ต่างจาก run-evidence ที่ private)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('event-images', 'event-images', true, 5242880, array['image/png','image/jpeg','image/webp']);

-- public bucket = อ่านได้เลยไม่ต้องผ่าน RLS แต่เขียน (insert/update/delete) ยังต้องมี policy อยู่ดี
-- จำกัดให้ admin เท่านั้น (เหมือนสิทธิ์จัดการงาน/เหรียญที่ทำผ่าน service-role client อยู่แล้ว)
create policy "admin manage event images" on storage.objects
  for all
  using (
    bucket_id = 'event-images'
    and exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  )
  with check (
    bucket_id = 'event-images'
    and exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  );
