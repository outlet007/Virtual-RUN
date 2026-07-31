-- ============================================================
-- bucket แยกสำหรับวิดีโอที่แนบในรายละเอียดงาน (RichTextEditor)
-- แยกจาก event-images เพราะ mime type/ขนาดไฟล์ต่างกันมาก
-- ============================================================

-- public bucket เหมือน event-images เพราะวิดีโอต้องเล่นได้ในหน้าเว็บสาธารณะ
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('event-videos', 'event-videos', true, 52428800, array['video/mp4', 'video/webm']);

-- สิทธิ์เขียนจำกัด admin เท่านั้น เหมือน event-images (อ่านสาธารณะได้เพราะ public bucket)
create policy "admin manage event videos" on storage.objects
  for all
  using (
    bucket_id = 'event-videos'
    and exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  )
  with check (
    bucket_id = 'event-videos'
    and exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  );
