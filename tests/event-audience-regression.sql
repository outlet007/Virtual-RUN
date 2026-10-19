begin;

-- Domain rule: exact suffix, case-insensitive, no look-alike domains.
do $$
begin
  if not public.email_matches_event_audience('anyone@gmail.com', 'all') then
    raise exception 'all_must_accept_any_email';
  end if;
  if not public.email_matches_event_audience(' Staff@BU.AC.TH ', 'staff') then
    raise exception 'staff_must_accept_bu_ac_th_case_insensitive';
  end if;
  if public.email_matches_event_audience('x@fakebu.ac.th', 'staff') then
    raise exception 'staff_must_reject_lookalike_domain';
  end if;
  if public.email_matches_event_audience('x@bu.ac.th.evil.com', 'staff') then
    raise exception 'staff_must_reject_domain_prefix';
  end if;
  if public.email_matches_event_audience('s@bumail.net', 'staff') then
    raise exception 'staff_must_reject_student_domain';
  end if;
  if not public.email_matches_event_audience('s@bumail.net', 'student') then
    raise exception 'student_must_accept_bumail_net';
  end if;
  if public.email_matches_event_audience('t@bu.ac.th', 'student') then
    raise exception 'student_must_reject_staff_domain';
  end if;
  if not public.email_matches_event_audience('t@bu.ac.th', 'staff_student')
     or not public.email_matches_event_audience('s@bumail.net', 'staff_student') then
    raise exception 'staff_student_must_accept_both_domains';
  end if;
  if public.email_matches_event_audience('x@gmail.com', 'staff_student') then
    raise exception 'staff_student_must_reject_outsiders';
  end if;
  if public.email_matches_event_audience(null, 'staff') then
    raise exception 'staff_must_reject_missing_email';
  end if;

  if has_function_privilege('anon', 'public.register_for_event(uuid,jsonb)', 'execute') then
    raise exception 'anon_must_not_execute_register_for_event';
  end if;
  if not has_function_privilege('authenticated', 'public.register_for_event(uuid,jsonb)', 'execute') then
    raise exception 'authenticated_must_execute_register_for_event';
  end if;
end;
$$;

-- Registration RPC trusts only a linked Google identity, never public.users or
-- an unverified email/password sign-up.
do $$
declare
  v_google_staff_id uuid := gen_random_uuid();
  v_password_staff_id uuid := gen_random_uuid();
  v_outsider_id uuid := gen_random_uuid();
  v_event_id uuid := gen_random_uuid();
  v_open_event_id uuid := gen_random_uuid();
  v_package_id uuid := gen_random_uuid();
  v_open_package_id uuid := gen_random_uuid();
  v_user uuid;
  v_rejected boolean;
begin
  insert into auth.users (id, email, aud, role)
  values
    (v_google_staff_id, 'audience.google@bu.ac.th', 'authenticated', 'authenticated'),
    (v_password_staff_id, 'audience.password@bu.ac.th', 'authenticated', 'authenticated'),
    (v_outsider_id, 'audience.outsider@gmail.com', 'authenticated', 'authenticated');
  insert into auth.identities (provider_id, user_id, identity_data, provider)
  values
    ('google-audience-staff', v_google_staff_id,
      jsonb_build_object('sub', 'google-audience-staff', 'email', 'audience.google@bu.ac.th'), 'google'),
    (v_password_staff_id::text, v_password_staff_id,
      jsonb_build_object('sub', v_password_staff_id::text, 'email', 'audience.password@bu.ac.th'), 'email'),
    (v_outsider_id::text, v_outsider_id,
      jsonb_build_object('sub', v_outsider_id::text, 'email', 'audience.outsider@gmail.com'), 'email');
  insert into public.users (id, email) values
    (v_google_staff_id, 'audience.google@bu.ac.th'),
    (v_password_staff_id, 'audience.password@bu.ac.th'),
    (v_outsider_id, 'audience.outsider@gmail.com')
  on conflict (id) do nothing;

  -- A self-edited profile email must not grant access.
  update public.users set email = 'spoofed@bu.ac.th' where id = v_outsider_id;

  insert into public.events (id, title, pricing, start_date, end_date, status, audience)
  values
    (v_event_id, 'Audience regression staff', 'free', current_date, current_date + 7, 'open', 'staff');
  insert into public.events (id, title, pricing, start_date, end_date, status)
  values
    (v_open_event_id, 'Audience regression all', 'free', current_date, current_date + 7, 'open');
  insert into public.packages (id, event_id, name, target_distance_km, price)
  values
    (v_package_id, v_event_id, 'Entry', 10, 0),
    (v_open_package_id, v_open_event_id, 'Entry', 10, 0);

  if (select audience from public.events where id = v_open_event_id) <> 'all' then
    raise exception 'audience_default_must_be_all';
  end if;

  foreach v_user in array array[v_outsider_id, v_password_staff_id] loop
    v_rejected := false;
    perform set_config('request.jwt.claim.sub', v_user::text, true);
    begin
      perform public.register_for_event(v_package_id, null);
    exception when others then
      if sqlerrm <> 'event_audience_not_allowed' then
        raise exception 'unexpected audience error for %: %', v_user, sqlerrm;
      end if;
      v_rejected := true;
    end;
    if not v_rejected then
      raise exception 'non_google_user_% must_not_register_for_staff_event', v_user;
    end if;
    perform public.register_for_event(v_open_package_id, null);
  end loop;

  perform set_config('request.jwt.claim.sub', v_google_staff_id::text, true);
  perform public.register_for_event(v_package_id, null);

  if (select count(*) from public.registrations where event_id = v_event_id) <> 1
     or not exists (
       select 1 from public.registrations
       where event_id = v_event_id and user_id = v_google_staff_id
     ) then
    raise exception 'staff_event_must_have_only_the_google_staff_registration';
  end if;
  if (select count(*) from public.registrations where event_id = v_open_event_id) <> 2 then
    raise exception 'all_event_must_accept_non_google_users';
  end if;
end;
$$;

rollback;
