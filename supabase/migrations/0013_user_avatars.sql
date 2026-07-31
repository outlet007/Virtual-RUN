-- ============================================================
-- รูปโปรไฟล์ (avatar) ของแต่ละ user — อัปโหลด/แก้ไขเองได้จากหน้า /profile
-- ============================================================

alter table public.users add column avatar_url text;

-- column grant เดิม (0002_admin_role.sql) จำกัดไว้ว่า user แก้ไขได้แค่บางคอลัมน์ของแถวตัวเอง
-- ต้องเพิ่ม avatar_url เข้าไปด้วย ไม่งั้น RLS ผ่านแต่ column privilege จะบล็อก
grant update (name, phone, line_user_id, avatar_url) on public.users to authenticated;

-- bucket แบบ public เพราะรูปโปรไฟล์ต้องโชว์ได้ (เช่นในหน้า dashboard/header) แต่เขียนได้แค่โฟลเดอร์ตัวเอง
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('user-avatars', 'user-avatars', true, 2097152, array['image/png', 'image/jpeg', 'image/webp']);

create policy "own avatar insert" on storage.objects for insert
  with check (bucket_id = 'user-avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "own avatar update" on storage.objects for update
  using (bucket_id = 'user-avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "own avatar delete" on storage.objects for delete
  using (bucket_id = 'user-avatars' and (storage.foldername(name))[1] = auth.uid()::text);
