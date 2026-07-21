-- ============================================================
-- Phase 3 — Strava connections + activity sync
-- ============================================================

-- strava_connections เดิมมีแค่ policy select ของตัวเอง (Phase 0 เผื่อไว้)
-- Phase 3 ต้องให้ user เชื่อม/ต่ออายุ/ตัดการเชื่อมต่อ Strava ของตัวเองได้ผ่าน session client ปกติ
create policy "own strava insert" on public.strava_connections for insert with check (auth.uid() = user_id);
create policy "own strava update" on public.strava_connections for update using (auth.uid() = user_id);
create policy "own strava delete" on public.strava_connections for delete using (auth.uid() = user_id);

-- webhook handler ไม่มี user session (Strava ยิงตรงมา) ต้องหา connection จาก strava_athlete_id ผ่าน service role
create index on public.strava_connections (strava_athlete_id);

-- กัน submission ซ้ำเวลา Strava ส่ง webhook event เดิมมาซ้ำ (redelivery)
alter table public.submissions
  add constraint submissions_strava_activity_id_key unique (strava_activity_id);

-- กิจกรรมจาก Strava ที่จับคู่ registration อัตโนมัติไม่ได้ (ไม่มี/มีมากกว่า 1 ใบสมัครที่ตรงช่วงวันงาน)
-- พักไว้ให้ user เลือกเองจากแดชบอร์ด
create table public.strava_pending_activities (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.users(id) on delete cascade,
  strava_activity_id  text not null,
  activity_type       text not null default 'run' check (activity_type in ('run','walk')),
  distance_km         numeric(6,2) not null,
  duration_sec        integer,
  activity_date       timestamptz not null,
  created_at          timestamptz not null default now(),
  unique (user_id, strava_activity_id)
);

alter table public.strava_pending_activities enable row level security;
create policy "own pending read"   on public.strava_pending_activities for select using (auth.uid() = user_id);
create policy "own pending delete" on public.strava_pending_activities for delete using (auth.uid() = user_id);
-- insert ทำผ่าน service role เท่านั้น (webhook/initial import) ไม่มี policy insert ให้ authenticated
