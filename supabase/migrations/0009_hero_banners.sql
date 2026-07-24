-- ============================================================
-- Hero banner carousel บนหน้าแรก — จัดการได้จากหลังบ้าน (เพิ่ม/แก้ไข/ลบ/เรียงลำดับ)
-- รูปเก็บใน bucket "event-images" เดิม (โฟลเดอร์ hero/) ไม่ต้องสร้าง bucket ใหม่
-- ============================================================

create table public.hero_banners (
  id         uuid primary key default gen_random_uuid(),
  image_url  text not null,
  title      text,
  subtitle   text,
  link_url   text,
  sort_order integer not null default 0,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.hero_banners enable row level security;

-- อ่านสาธารณะได้ (แสดงบนหน้าแรก) เขียน/แก้/ลบ ผ่าน service-role client เท่านั้น (ฝั่ง admin)
create policy "hero banners public read" on public.hero_banners for select using (true);
