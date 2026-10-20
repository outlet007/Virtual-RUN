-- ล้างข้อมูลช่วงทดสอบก่อนเปิดใช้จริง (ไม่ใช่ migration — รันครั้งเดียวด้วยมือ)
--
-- ลบ:   งานวิ่งทั้งหมด (+ แพ็กเกจ, เหรียญดิจิทัล/จริง, ระดับระยะ, ใบสมัคร, การชำระเงิน,
--       ผลวิ่ง, การจัดส่ง, ระดับที่ผ่าน), รางวัลและการแลกรางวัลทั้งหมด, คะแนนทั้งหมด,
--       เหรียญที่ผู้ใช้ได้รับ, การแจ้งเตือน, กิจกรรม Strava ที่รอนำเข้า, ประวัติจำกัดการส่งผล
-- เก็บ: บัญชีผู้ใช้ทั้งหมด + ความยินยอม + การเชื่อม Strava, บทความ/หมวดหมู่, Banner,
--       สถานที่รับรางวัล, Level, การตั้งค่าระบบ, เอกสาร Privacy/Terms, ประวัติการลบหลักฐาน
--
-- ค่าเริ่มต้น = dry-run (แสดงจำนวนก่อน/หลัง แล้ว rollback ทั้งหมด)
--   docker exec -i <db-container> psql -X -U postgres -d postgres < cleanup-test-data.sql
-- ลบจริง:
--   docker exec -i <db-container> psql -X -U postgres -d postgres -v apply=1 < cleanup-test-data.sql
--
-- ไฟล์ใน Storage ไม่หายตามแถวในฐานข้อมูล ให้รัน cleanup-test-storage.mjs ต่อหลังลบจริง

\set ON_ERROR_STOP on
\pset pager off

begin;

\echo '=== ก่อนลบ ==='
select
  (select count(*) from public.events) as events,
  (select count(*) from public.packages) as packages,
  (select count(*) from public.registrations) as registrations,
  (select count(*) from public.submissions) as submissions,
  (select count(*) from public.payments) as payments,
  (select count(*) from public.rewards) as rewards,
  (select count(*) from public.redemptions) as redemptions,
  (select count(*) from public.points_ledger) as points,
  (select count(*) from public.user_medals) as user_medals,
  (select count(*) from public.notifications) as notifications;

-- รางวัล: ต้องลบการแลกก่อน (redemptions → rewards เป็น NO ACTION)
delete from public.redemptions;
delete from public.rewards;

-- ใบสมัคร: ลบก่อนงาน (registrations → events/packages เป็น NO ACTION)
-- cascade: payments, submissions (+ review audit), shipments, ระดับระยะที่ผ่าน
delete from public.registrations;

-- งาน: cascade แพ็กเกจ, เหรียญดิจิทัล (+ user_medals), เหรียญจริง, ระดับระยะ
delete from public.events;

-- ข้อมูลที่ผูกกับผู้ใช้ซึ่งเกิดจากกิจกรรมทดสอบทั้งหมด
-- (คะแนนมาจากผลวิ่ง เหรียญโบนัส และการแลกรางวัลเท่านั้น → Level ทุกคนกลับเป็น Level 1)
delete from public.points_ledger;
delete from public.user_medals;
delete from public.notifications;
delete from public.strava_pending_activities;
delete from public.submission_rate_limit_attempts;

\echo '=== หลังลบ (ต้องเป็น 0 ทุกช่อง) ==='
select
  (select count(*) from public.events) as events,
  (select count(*) from public.packages) as packages,
  (select count(*) from public.registrations) as registrations,
  (select count(*) from public.submissions) as submissions,
  (select count(*) from public.payments) as payments,
  (select count(*) from public.rewards) as rewards,
  (select count(*) from public.redemptions) as redemptions,
  (select count(*) from public.points_ledger) as points,
  (select count(*) from public.user_medals) as user_medals,
  (select count(*) from public.notifications) as notifications;

\echo '=== ข้อมูลที่เก็บไว้ (ต้องไม่เปลี่ยน) ==='
select
  (select count(*) from public.users) as users,
  (select count(*) from public.consents) as consents,
  (select count(*) from public.content_articles) as articles,
  (select count(*) from public.content_categories) as categories,
  (select count(*) from public.hero_banners) as banners,
  (select count(*) from public.reward_pickup_locations) as pickup_locations,
  (select count(*) from public.levels) as levels;

\if :{?apply}
  commit;
  \echo 'APPLIED: ลบข้อมูลทดสอบแล้ว ต่อด้วย cleanup-test-storage.mjs เพื่อลบไฟล์ใน Storage'
\else
  rollback;
  \echo 'DRY-RUN: rollback แล้ว ไม่มีอะไรถูกลบ — รันซ้ำพร้อม -v apply=1 เพื่อลบจริง'
\endif
