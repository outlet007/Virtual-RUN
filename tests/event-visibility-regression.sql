\set ON_ERROR_STOP on
begin;

-- งานที่ซ่อน: ผู้ใช้มองไม่เห็นผ่าน RLS, สมัครใหม่ไม่ได้, ส่งผลวิ่งไม่ได้ (รวมผู้ที่สมัครไว้แล้ว)
do $$
declare
  v_user uuid := '00000000-0000-4000-8000-000000009701';
  v_other uuid := '00000000-0000-4000-8000-000000009702';
begin
  insert into auth.users (id, email, aud, role) values
    (v_user, 'visibility.member@test.local', 'authenticated', 'authenticated'),
    (v_other, 'visibility.other@test.local', 'authenticated', 'authenticated');
  insert into public.users (id, email) values
    (v_user, 'visibility.member@test.local'), (v_other, 'visibility.other@test.local')
  on conflict (id) do nothing;

  insert into public.events (id, title, pricing, start_date, end_date, status)
  values ('00000000-0000-4000-8000-000000009710', 'Visibility QA', 'free', current_date, current_date + 7, 'open');
  insert into public.packages (id, event_id, name, target_distance_km, price)
  values ('00000000-0000-4000-8000-000000009711', '00000000-0000-4000-8000-000000009710', 'Entry', 10, 0);

  if not (select is_visible from public.events where id = '00000000-0000-4000-8000-000000009710') then
    raise exception 'event_must_default_to_visible';
  end if;

  -- สมัครขณะงานยังแสดงอยู่
  perform set_config('request.jwt.claim.sub', v_user::text, true);
  perform public.register_for_event('00000000-0000-4000-8000-000000009711', null);
end;
$$;

update public.events set is_visible = false where id = '00000000-0000-4000-8000-000000009710';

-- มุมมองของผู้ใช้ที่สมัครแล้ว (role authenticated → RLS ทำงาน)
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000009701', true);
set local role authenticated;
do $$
begin
  if exists (select 1 from public.events where id = '00000000-0000-4000-8000-000000009710') then
    raise exception 'hidden_event_must_not_be_readable_by_members';
  end if;
end;
$$;
reset role;

do $$
declare
  v_registration uuid;
  v_rejected boolean := false;
begin
  -- คนใหม่สมัครไม่ได้
  perform set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000009702', true);
  begin
    perform public.register_for_event('00000000-0000-4000-8000-000000009711', null);
  exception when others then
    v_rejected := true;
  end;
  if not v_rejected then raise exception 'hidden_event_must_reject_registration'; end if;

  -- ผู้ที่สมัครไว้แล้วส่งผลวิ่งไม่ได้
  select id into v_registration from public.registrations
  where event_id = '00000000-0000-4000-8000-000000009710' and user_id = '00000000-0000-4000-8000-000000009701';
  v_rejected := false;
  begin
    insert into public.submissions (
      registration_id, user_id, source, activity_type, distance_km,
      activity_date, activity_local_date, activity_fingerprint, status
    ) values (
      v_registration, '00000000-0000-4000-8000-000000009701', 'upload', 'run', 5,
      now(), current_date, repeat('b', 64), 'approved'
    );
  exception when others then
    if sqlerrm <> 'event_not_available' then
      raise exception 'unexpected hidden submission error: %', sqlerrm;
    end if;
    v_rejected := true;
  end;
  if not v_rejected then raise exception 'hidden_event_must_reject_submissions'; end if;

  -- เปิดแสดงอีกครั้งแล้วส่งผลได้ตามปกติ
  update public.events set is_visible = true where id = '00000000-0000-4000-8000-000000009710';
  insert into public.submissions (
    registration_id, user_id, source, activity_type, distance_km,
    activity_date, activity_local_date, activity_fingerprint, status
  ) values (
    v_registration, '00000000-0000-4000-8000-000000009701', 'upload', 'run', 5,
    now(), current_date, repeat('c', 64), 'approved'
  );
end;
$$;

-- งานที่แสดงอยู่ต้องอ่านได้ตามปกติ
set local role authenticated;
do $$
begin
  if not exists (select 1 from public.events where id = '00000000-0000-4000-8000-000000009710') then
    raise exception 'visible_event_must_be_readable';
  end if;
end;
$$;
reset role;

rollback;
