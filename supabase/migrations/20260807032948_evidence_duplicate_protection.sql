-- ป้องกันการใช้หลักฐานผลวิ่งซ้ำข้ามบัญชี และเก็บ near-match เพื่อให้ Admin ตรวจ
alter table public.submissions
  add column normalized_sha256 text,
  add column evidence_phash text,
  add column duplicate_match_type text
    check (duplicate_match_type is null or duplicate_match_type in ('exact', 'normalized', 'perceptual')),
  add column duplicate_match_submission_id uuid
    references public.submissions(id) on delete set null,
  add column duplicate_similarity_distance smallint
    check (
      duplicate_similarity_distance is null
      or duplicate_similarity_distance between 0 and 64
    ),
  add constraint submissions_normalized_sha256_format_check
    check (normalized_sha256 is null or normalized_sha256 ~ '^[0-9a-f]{64}$'),
  add constraint submissions_evidence_phash_format_check
    check (evidence_phash is null or evidence_phash ~ '^[0-9a-f]{16}$'),
  add constraint submissions_duplicate_match_details_check
    check (
      (
        duplicate_match_type is null
        and duplicate_match_submission_id is null
        and duplicate_similarity_distance is null
      )
      or (
        duplicate_match_type is not null
        and duplicate_similarity_distance is not null
        and (
          duplicate_match_submission_id is null
          or duplicate_match_submission_id <> id
        )
      )
    );

-- หยุด migration พร้อมข้อความที่ชัดเจน หากข้อมูลเดิมมี SHA ซ้ำข้ามบัญชี
-- เพื่อให้ผู้ดูแลตรวจข้อมูลก่อนเปิดใช้ unique index แบบ global
do $$
begin
  if exists (
    select 1
    from public.submissions
    where evidence_sha256 is not null
    group by evidence_sha256
    having count(*) > 1
  ) then
    raise exception 'Cannot enforce global evidence SHA-256 uniqueness: duplicate hashes already exist';
  end if;
end
$$;

drop index if exists public.submissions_user_evidence_sha256_key;

create unique index submissions_evidence_sha256_key
  on public.submissions (evidence_sha256)
  where evidence_sha256 is not null;

create index submissions_normalized_sha256_idx
  on public.submissions (normalized_sha256)
  where normalized_sha256 is not null;

create index submissions_duplicate_match_submission_id_idx
  on public.submissions (duplicate_match_submission_id)
  where duplicate_match_submission_id is not null;

-- ค้นหา pHash ที่ใกล้ที่สุดโดย service role เท่านั้น
-- SECURITY INVOKER ทำให้สิทธิ์ของผู้เรียกยังถูกบังคับตามปกติ
create or replace function public.find_near_duplicate_evidence(
  candidate_phash text,
  max_distance integer default 10
)
returns table (submission_id uuid, distance integer)
language sql
stable
security invoker
set search_path = ''
as $$
  select candidate.submission_id, candidate.distance
  from (
    select
      submissions.id as submission_id,
      bit_count(
        (('x' || submissions.evidence_phash)::bit(64))
        # (('x' || lower(candidate_phash))::bit(64))
      )::integer as distance
    from public.submissions
    where submissions.evidence_phash ~ '^[0-9a-f]{16}$'
      and candidate_phash ~ '^[0-9a-fA-F]{16}$'
      and max_distance between 0 and 64
  ) as candidate
  where candidate.distance <= max_distance
  order by candidate.distance, candidate.submission_id
  limit 1;
$$;

revoke all on function public.find_near_duplicate_evidence(text, integer) from public;
revoke all on function public.find_near_duplicate_evidence(text, integer) from anon;
revoke all on function public.find_near_duplicate_evidence(text, integer) from authenticated;
grant execute on function public.find_near_duplicate_evidence(text, integer) to service_role;

-- RLS จำกัดแถว แต่ไม่สามารถซ่อนคอลัมน์ hash ภายในแถวของผู้ใช้ได้
-- จึงเปลี่ยน authenticated เป็น column-level SELECT เฉพาะข้อมูลที่หน้า Dashboard ใช้
revoke select on table public.submissions from authenticated;
grant select (
  id,
  registration_id,
  user_id,
  source,
  activity_type,
  distance_km,
  duration_sec,
  activity_date,
  strava_activity_id,
  evidence_url,
  status,
  created_at
) on table public.submissions to authenticated;
