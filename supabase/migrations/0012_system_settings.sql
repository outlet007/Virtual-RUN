-- ============================================================
-- ตั้งค่าระบบ (ชื่อ/โลโก้/favicon/สีธีม) แก้ผ่านหน้าเว็บได้จริง มีผลทันที
-- ตาราง singleton แถวเดียว อ่านได้ทุกคน (ทุกหน้าต้องใช้ตอน render) เขียนได้แค่ผ่าน admin action
-- ============================================================

create table public.system_settings (
  id smallint primary key default 1,
  constraint system_settings_singleton check (id = 1),
  site_name text not null default 'VirtualRun',
  logo_url text,
  favicon_url text,
  color_ink text not null default '#2C3B98',
  color_primary text not null default '#FEC81D',
  color_accent text not null default '#FF4A00',
  color_medal text not null default '#F5A524',
  updated_at timestamptz not null default now()
);

insert into public.system_settings (id) values (1);

alter table public.system_settings enable row level security;

-- ทุกหน้า (รวมผู้เยี่ยมชมที่ไม่ได้ล็อกอิน) ต้องอ่านค่านี้ตอน render เพื่อฉีด CSS variable/favicon/ชื่อระบบ
create policy "system settings public read" on public.system_settings for select using (true);
-- เขียนได้แค่ผ่าน service-role client (admin action) เท่านั้น — ไม่มี insert/update policy ให้ authenticated

-- bucket สำหรับโลโก้/favicon ที่ admin อัปโหลด
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('system-assets', 'system-assets', true, 2097152, array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/x-icon']);

create policy "admin manage system assets" on storage.objects
  for all
  using (
    bucket_id = 'system-assets'
    and exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  )
  with check (
    bucket_id = 'system-assets'
    and exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  );
