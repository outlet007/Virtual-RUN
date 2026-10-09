-- Virtual RUN synthetic sample data for schema version 3.8+
-- Contains no auth users, password hashes, PII, tokens, or private evidence.
-- Stable UUIDs and upserts make this file safe to run repeatedly.

begin;
set local timezone = 'Asia/Bangkok';

do $$
begin
  if to_regclass('public.events') is null
     or to_regclass('public.content_articles') is null
     or not exists (
       select 1 from information_schema.columns
       where table_schema = 'public'
         and table_name = 'system_settings'
         and column_name = 'privacy_header_title'
     ) then
    raise exception using
      message = 'Virtual RUN migrations are incomplete.',
      hint = 'Apply every file in supabase/migrations before installing sample data.';
  end if;
end
$$;

insert into public.events (
  id, title, title_en, description, description_en, cover_image, poster_image,
  pricing, start_date, end_date, status, cover_position_x, cover_position_y,
  bib_prefix, evidence_retention_days
)
values
  (
    '10000000-0000-4000-8000-000000000001',
    'Bangkok Sunrise Virtual Run', 'Bangkok Sunrise Virtual Run',
    'สะสมระยะวิ่งหรือเดินรับแสงเช้า ทำได้ทุกที่ตลอดช่วงกิจกรรม เหมาะสำหรับผู้เข้าร่วมทุกระดับ',
    'Collect running or walking distance at sunrise, anywhere throughout the event.',
    '/mock-events/bangkok-sunrise-virtual-run-2026.png',
    '/mock-events/bangkok-sunrise-virtual-run-2026.png',
    'free', current_date - 7, current_date + 30, 'open', 50, 50, 'SUN', 180
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    'Bangkok Neon Night Challenge', 'Bangkok Neon Night Challenge',
    'ท้าทายตัวเองกับการวิ่งและเดินยามค่ำคืน เลือกระยะที่เหมาะกับคุณและสะสมให้ครบก่อนจบกิจกรรม',
    'Take on a night running and walking challenge and complete your chosen distance.',
    '/mock-events/bangkok-neon-night-virtual-run-2026.png',
    '/mock-events/bangkok-neon-night-virtual-run-2026.png',
    'paid', current_date + 7, current_date + 60, 'open', 50, 50, 'NEON', 180
  ),
  (
    '10000000-0000-4000-8000-000000000003',
    'Green Miles Community Run', 'Green Miles Community Run',
    'กิจกรรมย้อนหลังสำหรับทดสอบหน้ารายละเอียดและประวัติงานที่สิ้นสุดแล้ว',
    'A completed event for testing historical event pages.',
    '/mock-events/green-miles-virtual-run-2026.png',
    '/mock-events/green-miles-virtual-run-2026.png',
    'free', current_date - 45, current_date - 10, 'closed', 50, 50, 'GREEN', 180
  )
on conflict (id) do update set
  title = excluded.title, title_en = excluded.title_en,
  description = excluded.description, description_en = excluded.description_en,
  cover_image = excluded.cover_image, poster_image = excluded.poster_image,
  pricing = excluded.pricing, start_date = excluded.start_date,
  end_date = excluded.end_date, status = excluded.status,
  cover_position_x = excluded.cover_position_x,
  cover_position_y = excluded.cover_position_y,
  bib_prefix = excluded.bib_prefix,
  evidence_retention_days = excluded.evidence_retention_days;

insert into public.medals (
  id, event_id, name, name_en, image_url, tier, unlock_rule, bonus_points, sort_order
)
values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'เหรียญ Sunrise 5K', 'Sunrise 5K Medal', '/mock-events/bangkok-sunrise-virtual-run-2026.png', 'bronze', '{"type":"distance","target_km":5}', 50, 1),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'เหรียญ Sunrise 21K', 'Sunrise 21K Medal', '/mock-events/bangkok-sunrise-virtual-run-2026.png', 'gold', '{"type":"distance","target_km":21}', 210, 2),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000002', 'เหรียญ Neon 10K', 'Neon 10K Medal', '/mock-events/bangkok-neon-night-virtual-run-2026.png', 'silver', '{"type":"distance","target_km":10}', 100, 1),
  ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000002', 'เหรียญ Neon 42K', 'Neon 42K Medal', '/mock-events/bangkok-neon-night-virtual-run-2026.png', 'legendary', '{"type":"distance","target_km":42}', 420, 2),
  ('20000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000003', 'เหรียญ Green Miles 30K', 'Green Miles 30K Medal', '/mock-events/green-miles-virtual-run-2026.png', 'gold', '{"type":"distance","target_km":30}', 300, 1)
on conflict (id) do update set
  event_id = excluded.event_id, name = excluded.name, name_en = excluded.name_en,
  image_url = excluded.image_url, tier = excluded.tier,
  unlock_rule = excluded.unlock_rule, bonus_points = excluded.bonus_points,
  sort_order = excluded.sort_order;

insert into public.physical_medals (
  id, event_id, name, name_en, description, description_en, image_url,
  tier, unlock_rule, bonus_points, sort_order
)
values
  ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'เหรียญจริง Sunrise Finisher', 'Sunrise Finisher Physical Medal', 'จัดส่งหลังผลระยะ 21K ผ่านการตรวจ', 'Shipped after the 21K result is approved.', '/mock-events/bangkok-sunrise-virtual-run-2026.png', 'gold', '{"type":"distance","target_km":21}', 100, 1),
  ('30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'เหรียญจริง Neon Finisher', 'Neon Finisher Physical Medal', 'เหรียญจริงสำหรับแพ็กเกจ Neon', 'Physical medal for Neon packages.', '/mock-events/bangkok-neon-night-virtual-run-2026.png', 'legendary', '{"type":"distance","target_km":10}', 150, 1),
  ('30000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000003', 'เหรียญจริง Green Miles', 'Green Miles Physical Medal', 'เหรียญตัวอย่างจากกิจกรรมย้อนหลัง', 'Sample medal from a completed event.', '/mock-events/green-miles-virtual-run-2026.png', 'gold', '{"type":"distance","target_km":30}', 100, 1)
on conflict (id) do update set
  event_id = excluded.event_id, name = excluded.name, name_en = excluded.name_en,
  description = excluded.description, description_en = excluded.description_en,
  image_url = excluded.image_url, tier = excluded.tier,
  unlock_rule = excluded.unlock_rule, bonus_points = excluded.bonus_points,
  sort_order = excluded.sort_order;

insert into public.packages (
  id, event_id, name, name_en, target_distance_km, price, activity_types,
  has_physical_medal, digital_medal_id, physical_medal_id, sort_order
)
values
  ('40000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Sunrise Starter 5K', 'Sunrise Starter 5K', 5, 0, '{run,walk}', false, '20000000-0000-4000-8000-000000000001', null, 1),
  ('40000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'Sunrise Half Marathon 21K', 'Sunrise Half Marathon 21K', 21, 0, '{run,walk}', true, '20000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000001', 2),
  ('40000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000002', 'Neon Night 10K', 'Neon Night 10K', 10, 250, '{run,walk}', true, '20000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000002', 1),
  ('40000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000002', 'Neon Marathon 42K', 'Neon Marathon 42K', 42, 450, '{run}', true, '20000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000002', 2),
  ('40000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000003', 'Green Miles 30K', 'Green Miles 30K', 30, 0, '{run,walk}', true, '20000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000003', 1)
on conflict (id) do update set
  event_id = excluded.event_id, name = excluded.name, name_en = excluded.name_en,
  target_distance_km = excluded.target_distance_km, price = excluded.price,
  activity_types = excluded.activity_types,
  has_physical_medal = excluded.has_physical_medal,
  digital_medal_id = excluded.digital_medal_id,
  physical_medal_id = excluded.physical_medal_id,
  sort_order = excluded.sort_order;

insert into public.reward_pickup_locations (
  id, name, name_en, address, address_en, contact_phone, contact_phone_en, maps_url, instructions,
  instructions_en, is_primary, is_active
)
values (
  '51000000-0000-4000-8000-000000000001',
  'ศูนย์กีฬา มหาวิทยาลัยกรุงเทพ',
  'Bangkok University Sports Center',
  'มหาวิทยาลัยกรุงเทพ วิทยาเขตรังสิต จังหวัดปทุมธานี',
  'Bangkok University, Rangsit Campus, Pathum Thani',
  '02-000-0000',
  '+66 2 000 0000',
  'https://maps.google.com',
  'แสดงหลักฐานการแลกรางวัลต่อเจ้าหน้าที่',
  'Show your redemption record to the staff.',
  false,
  true
)
on conflict (id) do update set
  name = excluded.name, name_en = excluded.name_en,
  address = excluded.address, address_en = excluded.address_en,
  contact_phone = excluded.contact_phone, contact_phone_en = excluded.contact_phone_en,
  maps_url = excluded.maps_url,
  instructions = excluded.instructions, instructions_en = excluded.instructions_en,
  is_active = excluded.is_active;

update public.reward_pickup_locations
set is_primary = true
where id = '51000000-0000-4000-8000-000000000001'
  and not exists (
    select 1 from public.reward_pickup_locations where is_primary
  );

insert into public.rewards (
  id, name, name_en, description, description_en, image_url, cost_points, stock,
  pickup_location_id, allows_pickup, allows_shipping
)
values
  ('50000000-0000-4000-8000-000000000001', 'ส่วนลดค่าสมัคร 100 บาท', 'THB 100 Registration Discount', 'คูปองตัวอย่างสำหรับกิจกรรมแบบชำระเงิน', 'A sample coupon for a paid event.', '/mock-events/bangkok-sunrise-virtual-run-2026.png', 500, 25, '51000000-0000-4000-8000-000000000001', true, true),
  ('50000000-0000-4000-8000-000000000002', 'เสื้อ Virtual RUN รุ่นตัวอย่าง', 'Virtual RUN Sample Shirt', 'ใช้ทดสอบการแลกรางวัลและจัดส่ง', 'For testing redemption and fulfilment.', '/mock-events/bangkok-neon-night-virtual-run-2026.png', 1200, 10, '51000000-0000-4000-8000-000000000001', true, true),
  ('50000000-0000-4000-8000-000000000003', 'กระบอกน้ำรักษ์โลก', 'Eco Water Bottle', 'กระบอกน้ำใช้ซ้ำสำหรับนักวิ่ง', 'A reusable water bottle for runners.', '/mock-events/green-miles-virtual-run-2026.png', 800, 15, '51000000-0000-4000-8000-000000000001', true, true)
on conflict (id) do update set
  name = excluded.name, name_en = excluded.name_en,
  description = excluded.description, description_en = excluded.description_en,
  image_url = excluded.image_url, cost_points = excluded.cost_points,
  stock = excluded.stock,
  pickup_location_id = excluded.pickup_location_id,
  allows_pickup = excluded.allows_pickup,
  allows_shipping = excluded.allows_shipping;

insert into public.hero_banners (
  id, image_url, kicker, kicker_en, title, title_en, highlight, highlight_en,
  title_suffix, title_suffix_en, subtitle, subtitle_en, link_url,
  sort_order, is_active, position_x, position_y
)
values
  ('60000000-0000-4000-8000-000000000001', '/mock-events/bangkok-sunrise-virtual-run-2026.png', 'Run · Walk · Collect', 'Run · Walk · Collect', 'เริ่มต้นเช้าวันใหม่', 'Start a Brighter Morning', 'สะสมทุกกิโลเมตร', 'Collect Every Kilometer', 'ไปด้วยกัน', 'Together', 'เลือกเป้าหมาย แล้ววิ่งหรือเดินได้ทุกที่ตลอดช่วงกิจกรรม', 'Choose your goal, then run or walk anywhere throughout the event.', '/events/10000000-0000-4000-8000-000000000001', 1, true, 50, 50),
  ('60000000-0000-4000-8000-000000000002', '/mock-events/bangkok-neon-night-virtual-run-2026.png', 'Night Challenge', 'Night Challenge', 'ค่ำคืนนี้ยังอีกไกล', 'The Night Is Still Young', 'ปลดล็อกพลังของคุณ', 'Unlock Your Energy', 'ใต้แสงนีออน', 'Under Neon Lights', 'สะสมระยะให้ครบก่อนสิ้นสุดกิจกรรม', 'Complete your distance before the event ends.', '/events/10000000-0000-4000-8000-000000000002', 2, true, 50, 50),
  ('60000000-0000-4000-8000-000000000003', '/mock-events/green-miles-virtual-run-2026.png', 'Healthy Community', 'Healthy Community', 'ทุกก้าวมีความหมาย', 'Every Step Matters', 'วิ่งเพื่อสุขภาพ', 'Move for Health', 'และชุมชน', 'and Community', 'อ่านข่าว เทคนิค และกิจกรรมใหม่จาก Virtual RUN', 'Explore Virtual RUN news, tips, and activities.', '/articles', 3, true, 50, 50)
on conflict (id) do update set
  image_url = excluded.image_url, kicker = excluded.kicker,
  kicker_en = excluded.kicker_en, title = excluded.title,
  title_en = excluded.title_en, highlight = excluded.highlight,
  highlight_en = excluded.highlight_en,
  title_suffix = excluded.title_suffix,
  title_suffix_en = excluded.title_suffix_en,
  subtitle = excluded.subtitle, subtitle_en = excluded.subtitle_en,
  link_url = excluded.link_url, sort_order = excluded.sort_order,
  is_active = excluded.is_active, position_x = excluded.position_x,
  position_y = excluded.position_y;

insert into public.content_categories (
  id, name, name_en, slug, description, description_en, sort_order,
  is_active, badge_background_color, badge_text_color
)
values
  ('70000000-0000-4000-8000-000000000001', 'เริ่มต้นวิ่ง', 'Getting Started', 'sample-getting-started', 'คำแนะนำสำหรับผู้เริ่มต้นวิ่งและเดิน', 'Practical guidance for new runners and walkers.', 1, true, '#FEC81D', '#1C1C1C'),
  ('70000000-0000-4000-8000-000000000002', 'สุขภาพและการฟื้นตัว', 'Health and Recovery', 'sample-health-recovery', 'แนวทางดูแลสุขภาพและฟื้นตัว', 'Guidance for healthy training and recovery.', 2, true, '#DDE7FF', '#2C3B98'),
  ('70000000-0000-4000-8000-000000000003', 'ข่าวกิจกรรม', 'Event News', 'sample-event-news', 'ข่าวสารจาก Virtual RUN', 'News from Virtual RUN.', 3, true, '#FFE1D5', '#8A2600')
on conflict (id) do update set
  name = excluded.name, name_en = excluded.name_en, slug = excluded.slug,
  description = excluded.description, description_en = excluded.description_en,
  sort_order = excluded.sort_order, is_active = excluded.is_active,
  badge_background_color = excluded.badge_background_color,
  badge_text_color = excluded.badge_text_color;

insert into public.content_articles (
  id, category_id, title, title_en, slug, excerpt, excerpt_en,
  content_html, content_html_en, banner_image_url,
  banner_position_x, banner_position_y, cta_label, cta_label_en, cta_url,
  status, is_featured, published_at, seo_title, seo_title_en,
  seo_description, seo_description_en
)
values
  ('80000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000001', 'เริ่ม Virtual Run ครั้งแรกใน 5 ขั้นตอน', 'Your First Virtual Run in Five Steps', 'sample-first-virtual-run', 'ตั้งเป้าหมาย เลือกแพ็กเกจ บันทึกกิจกรรม และส่งผลอย่างถูกต้อง', 'Set a goal, choose a package, record activities, and submit your result.', '<h2>เริ่มต้นได้ง่าย</h2><ol><li>เลือกงานและระยะ</li><li>สมัครแพ็กเกจ</li><li>วิ่งหรือเดินตามกติกา</li><li>เก็บหลักฐาน</li><li>ส่งผลเพื่อรอตรวจสอบ</li></ol>', '<h2>Getting started is simple</h2><ol><li>Choose an event and distance.</li><li>Register.</li><li>Run or walk.</li><li>Keep evidence.</li><li>Submit for review.</li></ol>', '/mock-events/bangkok-sunrise-virtual-run-2026.png', 50, 50, 'ดูงานที่เปิดรับสมัคร', 'View Open Events', '/', 'published', true, now() - interval '3 days', 'เริ่ม Virtual Run ครั้งแรก', 'Start Your First Virtual Run', 'คู่มือเริ่มต้น Virtual Run', 'A guide to starting a Virtual Run.'),
  ('80000000-0000-4000-8000-000000000002', '70000000-0000-4000-8000-000000000002', 'ฟื้นตัวอย่างไรหลังวันวิ่งระยะไกล', 'How to Recover After a Long Run', 'sample-long-run-recovery', 'หลักการพัก ดื่มน้ำ รับประทานอาหาร และกลับมาฝึกอย่างเหมาะสม', 'Rest, hydration, nutrition, and a sensible return to training.', '<h2>ให้เวลากับการฟื้นตัว</h2><p>ดื่มน้ำ รับประทานอาหาร และนอนหลับให้เพียงพอ หากเจ็บต่อเนื่องควรหยุดและปรึกษาผู้เชี่ยวชาญ</p>', '<h2>Give recovery enough time</h2><p>Rehydrate, eat appropriately, and sleep well. Stop and seek professional advice if pain persists.</p>', '/mock-events/green-miles-virtual-run-2026.png', 50, 50, null, null, null, 'published', true, now() - interval '2 days', 'การฟื้นตัวหลังวิ่งระยะไกล', 'Long Run Recovery', 'แนวทางดูแลร่างกายหลังวิ่ง', 'Recovery guidance after a long run.'),
  ('80000000-0000-4000-8000-000000000003', '70000000-0000-4000-8000-000000000003', 'เปิดรับสมัคร Bangkok Neon Night Challenge', 'Bangkok Neon Night Challenge Is Open', 'sample-neon-night-open', 'เลือกแพ็กเกจ 10K หรือ 42K และร่วมสะสมระยะยามค่ำคืน', 'Choose a 10K or 42K package and join the night challenge.', '<h2>กิจกรรมใหม่พร้อมแล้ว</h2><p>แพ็กเกจ 10K รองรับวิ่งและเดิน ส่วน 42K สำหรับวิ่ง พร้อมตัวอย่างเหรียญดิจิทัลและเหรียญจริง</p>', '<h2>A new challenge is ready</h2><p>The 10K package accepts running and walking; the 42K package is for running.</p>', '/mock-events/bangkok-neon-night-virtual-run-2026.png', 50, 50, 'สมัครกิจกรรม', 'Join the Event', '/events/10000000-0000-4000-8000-000000000002', 'published', true, now() - interval '1 day', 'Neon Night เปิดรับสมัคร', 'Neon Night Is Open', 'ข่าวเปิดรับสมัครกิจกรรมตัวอย่าง', 'Registration news for the sample event.'),
  ('80000000-0000-4000-8000-000000000004', '70000000-0000-4000-8000-000000000001', 'เช็กลิสต์หลักฐานก่อนส่งผล', 'Evidence Checklist Before Submission', 'sample-evidence-checklist', 'ตรวจวันที่ ระยะเวลา ระยะทาง และความชัดเจนของภาพก่อนส่งผล', 'Check date, duration, distance, and image clarity before submission.', '<h2>ตรวจให้ครบก่อนส่ง</h2><ul><li>วันที่ถูกต้อง</li><li>เห็นระยะและเวลาชัดเจน</li><li>ภาพไม่ตัดข้อมูลสำคัญ</li></ul>', '<h2>Review before submitting</h2><ul><li>Correct date.</li><li>Readable distance and duration.</li><li>No important details are cropped.</li></ul>', '/mock-events/bangkok-sunrise-virtual-run-2026.png', 50, 50, null, null, null, 'published', false, now() - interval '4 hours', 'เช็กลิสต์หลักฐานวิ่ง', 'Evidence Submission Checklist', 'รายการตรวจสอบก่อนส่งผล', 'A checklist before submitting evidence.')
on conflict (id) do update set
  category_id = excluded.category_id, title = excluded.title,
  title_en = excluded.title_en, slug = excluded.slug,
  excerpt = excluded.excerpt, excerpt_en = excluded.excerpt_en,
  content_html = excluded.content_html,
  content_html_en = excluded.content_html_en,
  banner_image_url = excluded.banner_image_url,
  banner_position_x = excluded.banner_position_x,
  banner_position_y = excluded.banner_position_y,
  cta_label = excluded.cta_label, cta_label_en = excluded.cta_label_en,
  cta_url = excluded.cta_url, status = excluded.status,
  is_featured = excluded.is_featured, published_at = excluded.published_at,
  seo_title = excluded.seo_title, seo_title_en = excluded.seo_title_en,
  seo_description = excluded.seo_description,
  seo_description_en = excluded.seo_description_en, updated_at = now();

commit;

select 'events' as sample_group, count(*) as installed_rows
from public.events where id::text like '10000000-0000-4000-8000-%'
union all select 'digital_medals', count(*) from public.medals where id::text like '20000000-0000-4000-8000-%'
union all select 'physical_medals', count(*) from public.physical_medals where id::text like '30000000-0000-4000-8000-%'
union all select 'packages', count(*) from public.packages where id::text like '40000000-0000-4000-8000-%'
union all select 'rewards', count(*) from public.rewards where id::text like '50000000-0000-4000-8000-%'
union all select 'hero_banners', count(*) from public.hero_banners where id::text like '60000000-0000-4000-8000-%'
union all select 'content_categories', count(*) from public.content_categories where id::text like '70000000-0000-4000-8000-%'
union all select 'content_articles', count(*) from public.content_articles where id::text like '80000000-0000-4000-8000-%'
order by sample_group;
