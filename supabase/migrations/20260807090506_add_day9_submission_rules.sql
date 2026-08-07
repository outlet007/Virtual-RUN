-- Day 9: configurable submission rules and structured flag reasons.
alter table public.system_settings
  add column submission_max_distance_km numeric(6,2) not null default 100,
  add column submission_daily_limit smallint not null default 3,
  add constraint system_settings_submission_max_distance_check
    check (submission_max_distance_km between 0.1 and 1000),
  add constraint system_settings_submission_daily_limit_check
    check (submission_daily_limit between 1 and 50);

alter table public.submissions
  add column activity_local_date date,
  add column flag_reason text[] not null default '{}'::text[],
  add constraint submissions_flag_reason_values_check
    check (
      flag_reason <@ array[
        'missing_duration',
        'pace_too_fast',
        'pace_too_slow',
        'distance_exceeds_limit',
        'daily_submission_limit_exceeded',
        'activity_before_event',
        'activity_after_event'
      ]::text[]
    );

update public.submissions
set activity_local_date = (activity_date at time zone 'Asia/Bangkok')::date
where activity_local_date is null;

alter table public.submissions
  alter column activity_local_date set not null;

-- รองรับ query นับจำนวนผลต่อวันของใบสมัครโดยใช้ equality ทั้งสองคอลัมน์.
create index submissions_registration_activity_local_date_idx
  on public.submissions (registration_id, activity_local_date);

-- ทุกจุดสร้างผลวิ่งในแอปใช้ server action/service role เพื่อให้ Rule Engine ทำงานก่อน insert.
-- ปิด direct insert จาก Data API ป้องกันผู้ใช้กำหนด status/flag_reason เองแล้วข้ามกฎ.
revoke insert on table public.submissions from authenticated;
