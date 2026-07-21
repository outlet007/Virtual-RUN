-- ============================================================
-- Phase 2 — Admin role
-- ============================================================

alter table public.users
  add column role text not null default 'user' check (role in ('user','admin'));

-- ป้องกันการ self-promote: "own profile update" policy อนุญาตอัปเดตทุกคอลัมน์ของแถวตัวเอง (RLS แค่กรอง row ไม่กรอง column)
-- Postgres ไม่รองรับ "revoke column จาก table-level grant" แบบหักออกบางส่วน (แค่ revoke ปุ๊บ table-level update หายไปทั้งก้อน
-- ไม่เหลือ column อื่นให้แก้เลย) ต้องทำแบบ additive-only: revoke ทั้งตารางก่อน แล้ว grant กลับเฉพาะ column ที่ยอมให้ user แก้เอง
revoke update on public.users from authenticated;
grant update (name, phone, line_user_id) on public.users to authenticated;
grant update (role) on public.users to service_role;

-- ให้ shipment action ทำ upsert(onConflict: registration_id) ได้ — หนึ่ง registration มีได้แค่หนึ่ง shipment
alter table public.shipments
  add constraint shipments_registration_id_key unique (registration_id);
