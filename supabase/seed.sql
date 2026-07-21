-- ข้อมูลตัวอย่างสำหรับทดสอบ Phase 0-1
-- รันหลัง migration: events + packages (เปิดให้ลงทะเบียนได้)

with e1 as (
  insert into public.events (title, description, pricing, start_date, end_date, status)
  values (
    'Sunrise Virtual Run 2026',
    'วิ่งรับอรุณสะสมระยะตลอดเดือน วิ่งที่ไหนเมื่อไหร่ก็ได้ ครบระยะรับเหรียญ',
    'free', '2026-08-01', '2026-08-31', 'open'
  ) returning id
)
insert into public.packages (event_id, name, target_distance_km, price, has_physical_medal)
select id, '10K Challenge', 10, 0, false from e1
union all
select id, '42K Challenge', 42, 0, true from e1
union all
select id, '100K Collector', 100, 0, true from e1;

with e2 as (
  insert into public.events (title, description, pricing, start_date, end_date, status)
  values (
    'Bangkok Night Walk',
    'เดินสะสมระยะยามค่ำ เหมาะสำหรับสายเดินและเริ่มต้นออกกำลังกาย',
    'paid', '2026-09-01', '2026-09-30', 'open'
  ) returning id
)
insert into public.packages (event_id, name, target_distance_km, price, has_physical_medal)
select id, 'Walk 30K', 30, 250, true from e2
union all
select id, 'Walk 60K', 60, 350, true from e2;
