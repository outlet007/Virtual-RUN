-- เพิ่มระดับสิทธิ์สำหรับหลังบ้าน โดยย้าย admin เดิมเป็น super_admin
-- เพื่อรักษาสิทธิ์ในการจัดการผู้ดูแลระบบหลัง deploy migration
alter table public.users drop constraint if exists users_role_check;

alter table public.users
  add constraint users_role_check
  check (role in ('user', 'staff', 'admin', 'super_admin'));

update public.users set role = 'super_admin' where role = 'admin';

comment on column public.users.role is
  'user=สมาชิก, staff=เจ้าหน้าที่, admin=ผู้ดูแลระบบ, super_admin=ผู้ดูแลระบบสูงสุด';

drop policy if exists "admin manage event images" on storage.objects;
create policy "admin manage event images" on storage.objects
  for all to authenticated
  using (bucket_id = 'event-images' and exists (
    select 1 from public.users u
    where u.id = (select auth.uid()) and u.role in ('admin', 'super_admin')
  ))
  with check (bucket_id = 'event-images' and exists (
    select 1 from public.users u
    where u.id = (select auth.uid()) and u.role in ('admin', 'super_admin')
  ));

drop policy if exists "admin manage event videos" on storage.objects;
create policy "admin manage event videos" on storage.objects
  for all to authenticated
  using (bucket_id = 'event-videos' and exists (
    select 1 from public.users u
    where u.id = (select auth.uid()) and u.role in ('admin', 'super_admin')
  ))
  with check (bucket_id = 'event-videos' and exists (
    select 1 from public.users u
    where u.id = (select auth.uid()) and u.role in ('admin', 'super_admin')
  ));

drop policy if exists "admin manage system assets" on storage.objects;
create policy "admin manage system assets" on storage.objects
  for all to authenticated
  using (bucket_id = 'system-assets' and exists (
    select 1 from public.users u
    where u.id = (select auth.uid()) and u.role = 'super_admin'
  ))
  with check (bucket_id = 'system-assets' and exists (
    select 1 from public.users u
    where u.id = (select auth.uid()) and u.role = 'super_admin'
  ));
