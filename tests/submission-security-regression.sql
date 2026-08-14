\set ON_ERROR_STOP on
begin;

do $$
declare
  v_user_id uuid;
  v_reviewer_id uuid;
  v_submission_id uuid;
  v_status text;
  v_duplicate_type text;
  v_rate_result text;
  v_count integer;
begin
  select id into v_user_id
  from public.users
  where role = 'user'
  order by created_at
  limit 1;

  select id into v_reviewer_id
  from public.users
  where role in ('super_admin', 'admin', 'staff')
  order by created_at
  limit 1;

  if v_user_id is null or v_reviewer_id is null then
    raise exception 'qa_requires_user_and_reviewer';
  end if;

  if has_function_privilege(
    'authenticated',
    'public.create_guarded_submission(uuid,uuid,text,text,numeric,integer,timestamptz,date,text[],text,text,text,text,text,text,text,numeric,numeric,text,timestamptz,integer)',
    'execute'
  ) then
    raise exception 'authenticated_must_not_execute_guarded_submission';
  end if;

  if has_function_privilege(
    'authenticated',
    'public.review_submission_guarded(uuid,uuid,text,text)',
    'execute'
  ) then
    raise exception 'authenticated_must_not_execute_guarded_review';
  end if;

  if has_table_privilege('service_role', 'public.submission_rate_limit_attempts', 'update') then
    raise exception 'service_role_must_not_update_rate_limit_attempts';
  end if;

  if has_table_privilege('service_role', 'public.submission_review_audit', 'update')
     or has_table_privilege('service_role', 'public.submission_review_audit', 'delete') then
    raise exception 'service_role_must_not_modify_review_audit';
  end if;

  select public.consume_submission_rate_limit(
    v_user_id,
    repeat('1', 64),
    1,
    10,
    600
  ) into v_rate_result;
  if v_rate_result <> 'allowed' then raise exception 'first_rate_attempt_must_pass'; end if;

  select public.consume_submission_rate_limit(
    v_user_id,
    repeat('1', 64),
    1,
    10,
    600
  ) into v_rate_result;
  if v_rate_result <> 'user_limit' then raise exception 'second_rate_attempt_must_be_limited'; end if;

  insert into public.events (id, title, pricing, start_date, end_date, status)
  values (
    '00000000-0000-4000-8000-000000009501',
    'QA submission security',
    'free',
    '2026-08-01',
    '2026-08-31',
    'open'
  );

  insert into public.packages (
    id, event_id, name, target_distance_km, price, activity_types
  ) values (
    '00000000-0000-4000-8000-000000009502',
    '00000000-0000-4000-8000-000000009501',
    'QA protected package',
    10,
    0,
    array['run']
  );

  insert into public.registrations (
    id, user_id, package_id, event_id, status
  ) values (
    '00000000-0000-4000-8000-000000009503',
    v_user_id,
    '00000000-0000-4000-8000-000000009502',
    '00000000-0000-4000-8000-000000009501',
    'confirmed'
  );

  select submission_id, submission_status
  into v_submission_id, v_status
  from public.create_guarded_submission(
    p_registration_id => '00000000-0000-4000-8000-000000009503',
    p_user_id => v_user_id,
    p_source => 'upload',
    p_activity_type => 'run',
    p_distance_km => 5,
    p_duration_sec => 1800,
    p_activity_date => '2026-08-14 00:00:00+07',
    p_activity_local_date => '2026-08-14',
    p_flag_reason => array[]::text[],
    p_activity_fingerprint => repeat('1', 64),
    p_evidence_url => 'qa/first.jpg',
    p_evidence_sha256 => repeat('a', 64),
    p_normalized_sha256 => repeat('b', 64),
    p_evidence_phash => '0000000000000000',
    p_ocr_status => 'matched',
    p_ocr_distance_km => 5,
    p_ocr_confidence => 99,
    p_ocr_processed_at => now()
  );
  if v_status <> 'approved' then raise exception 'first_submission_must_be_approved'; end if;

  begin
    perform public.create_guarded_submission(
      p_registration_id => '00000000-0000-4000-8000-000000009503',
      p_user_id => v_user_id,
      p_source => 'upload',
      p_activity_type => 'run',
      p_distance_km => 6,
      p_duration_sec => 2000,
      p_activity_date => '2026-08-14 00:00:00+07',
      p_activity_local_date => '2026-08-14',
      p_flag_reason => array[]::text[],
      p_activity_fingerprint => repeat('2', 64),
      p_evidence_url => 'qa/normalized-copy.jpg',
      p_evidence_sha256 => repeat('c', 64),
      p_normalized_sha256 => repeat('b', 64),
      p_evidence_phash => 'ffffffffffffffff',
      p_ocr_status => 'matched'
    );
    raise exception 'normalized_duplicate_was_accepted';
  exception when unique_violation then
    if sqlerrm <> 'duplicate_evidence_normalized' then raise; end if;
  end;

  select submission_id, submission_status, duplicate_type
  into v_submission_id, v_status, v_duplicate_type
  from public.create_guarded_submission(
    p_registration_id => '00000000-0000-4000-8000-000000009503',
    p_user_id => v_user_id,
    p_source => 'upload',
    p_activity_type => 'run',
    p_distance_km => 5,
    p_duration_sec => 1800,
    p_activity_date => '2026-08-14 00:00:00+07',
    p_activity_local_date => '2026-08-14',
    p_flag_reason => array[]::text[],
    p_activity_fingerprint => repeat('1', 64),
    p_evidence_url => 'qa/activity-copy.jpg',
    p_evidence_sha256 => repeat('c', 64),
    p_normalized_sha256 => repeat('d', 64),
    p_evidence_phash => 'ffffffffffffffff',
    p_ocr_status => 'matched'
  );
  if v_status <> 'flagged' or v_duplicate_type <> 'activity' then
    raise exception 'activity_duplicate_must_be_flagged';
  end if;

  select submission_id, submission_status, duplicate_type
  into v_submission_id, v_status, v_duplicate_type
  from public.create_guarded_submission(
    p_registration_id => '00000000-0000-4000-8000-000000009503',
    p_user_id => v_user_id,
    p_source => 'upload',
    p_activity_type => 'run',
    p_distance_km => 7,
    p_duration_sec => 2400,
    p_activity_date => '2026-08-14 00:00:00+07',
    p_activity_local_date => '2026-08-14',
    p_flag_reason => array[]::text[],
    p_activity_fingerprint => repeat('3', 64),
    p_evidence_url => 'qa/perceptual-copy.jpg',
    p_evidence_sha256 => repeat('e', 64),
    p_normalized_sha256 => repeat('f', 64),
    p_evidence_phash => '0000000000000001',
    p_ocr_status => 'matched'
  );
  if v_status <> 'flagged' or v_duplicate_type <> 'perceptual' then
    raise exception 'perceptual_duplicate_must_be_flagged';
  end if;

  begin
    perform public.review_submission_guarded(
      v_submission_id,
      v_reviewer_id,
      'approved',
      null
    );
    raise exception 'duplicate_approval_without_reason_was_accepted';
  exception when others then
    if sqlerrm <> 'duplicate_approval_reason_required' then raise; end if;
  end;

  perform public.review_submission_guarded(
    v_submission_id,
    v_reviewer_id,
    'approved',
    'Compared against source and accepted for QA'
  );

  select count(*) into v_count
  from public.submission_review_audit
  where submission_id = v_submission_id
    and reviewer_id = v_reviewer_id
    and previous_status = 'flagged'
    and new_status = 'approved'
    and review_note = 'Compared against source and accepted for QA';
  if v_count <> 1 then raise exception 'review_audit_row_missing'; end if;
end;
$$;

rollback;
