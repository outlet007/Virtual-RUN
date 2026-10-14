begin;

do $$
declare
  v_user_id uuid;
  v_event_id uuid := gen_random_uuid();
  v_package_id uuid := gen_random_uuid();
  v_registration_id uuid := gen_random_uuid();
  v_level_id uuid := gen_random_uuid();
  v_first_sync integer;
  v_second_sync integer;
  v_count integer;
  v_points integer;
begin
  select id into v_user_id from public.users order by created_at limit 1;
  if v_user_id is null then
    raise exception 'event distance level regression needs one local user';
  end if;

  insert into public.events (
    id, title, pricing, start_date, end_date, status, event_mode
  ) values (
    v_event_id, 'Distance level regression', 'free', current_date,
    current_date + 7, 'open', 'distance_levels'
  );

  insert into public.packages (
    id, event_id, name, target_distance_km, price
  ) values (
    v_package_id, v_event_id, 'Entry', 65, 0
  );

  insert into public.event_distance_levels (
    id, event_id, name, target_distance_km, sort_order, bonus_points
  ) values (
    v_level_id, v_event_id, 'Level 20', 20, 1, 50
  );

  insert into public.registrations (
    id, user_id, package_id, event_id, status
  ) values (
    v_registration_id, v_user_id, v_package_id, v_event_id, 'confirmed'
  );

  insert into public.submissions (
    registration_id, user_id, source, activity_type, distance_km,
    activity_date, activity_local_date, activity_fingerprint, status
  ) values (
    v_registration_id, v_user_id, 'upload', 'run', 25,
    now(), current_date, repeat('a', 64), 'approved'
  );

  select public.sync_registration_distance_levels(v_registration_id)
  into v_first_sync;
  select public.sync_registration_distance_levels(v_registration_id)
  into v_second_sync;

  if v_first_sync <> 1 or v_second_sync <> 0 then
    raise exception 'distance level sync is not idempotent: first %, second %',
      v_first_sync, v_second_sync;
  end if;

  select count(*) into v_count
  from public.registration_distance_level_achievements
  where registration_id = v_registration_id and level_id = v_level_id;
  if v_count <> 1 then
    raise exception 'expected one achievement, found %', v_count;
  end if;

  select coalesce(sum(delta), 0) into v_points
  from public.points_ledger
  where user_id = v_user_id
    and ref_type = 'event_distance_level'
    and ref_id = v_level_id;
  if v_points <> 50 then
    raise exception 'expected 50 level points, found %', v_points;
  end if;

  begin
    insert into public.registrations (
      user_id, package_id, event_id, status
    ) values (
      v_user_id, v_package_id, v_event_id, 'confirmed'
    );
    raise exception 'duplicate active level-event registration was accepted';
  exception
    when unique_violation then null;
  end;

  if not (
    select relrowsecurity
    from pg_class
    where oid = 'public.event_distance_levels'::regclass
  ) then
    raise exception 'RLS is disabled on event_distance_levels';
  end if;

  if has_function_privilege(
    'authenticated',
    'public.sync_registration_distance_levels(uuid)',
    'EXECUTE'
  ) then
    raise exception 'authenticated must not execute distance level sync';
  end if;
end;
$$;

rollback;
