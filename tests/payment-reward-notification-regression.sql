\set ON_ERROR_STOP on
begin;

do $$
declare
  v_user_id uuid;
  v_changed boolean;
  v_count integer;
  v_stock integer;
  v_points integer;
begin
  select id into v_user_id from public.users order by created_at limit 1;
  if v_user_id is null then
    raise exception 'qa_requires_existing_user';
  end if;

  update public.users
  set name = coalesce(name, 'QA Runner'),
      address = '1 Test Road',
      province = 'Bangkok',
      postal_code = '10110'
  where id = v_user_id;

  if has_function_privilege('anon', 'public.review_payment(uuid,uuid,text)', 'execute') then
    raise exception 'anon_must_not_execute_review_payment';
  end if;
  if has_function_privilege('authenticated', 'public.review_payment(uuid,uuid,text)', 'execute') then
    raise exception 'authenticated_must_not_execute_review_payment';
  end if;
  if not has_function_privilege('service_role', 'public.review_payment(uuid,uuid,text)', 'execute') then
    raise exception 'service_role_must_execute_review_payment';
  end if;

  insert into public.events (id, title, pricing, start_date, end_date, status)
  values ('00000000-0000-4000-8000-000000009401', 'QA atomic payment', 'paid', current_date, current_date + 1, 'open');
  insert into public.packages (id, event_id, name, target_distance_km, price)
  values
    ('00000000-0000-4000-8000-000000009402', '00000000-0000-4000-8000-000000009401', 'QA confirm', 5, 100),
    ('00000000-0000-4000-8000-000000009405', '00000000-0000-4000-8000-000000009401', 'QA reject', 10, 200);
  insert into public.registrations (id, user_id, package_id, event_id, bib_number)
  values
    ('00000000-0000-4000-8000-000000009403', v_user_id, '00000000-0000-4000-8000-000000009402', '00000000-0000-4000-8000-000000009401', 'QA9403'),
    ('00000000-0000-4000-8000-000000009406', v_user_id, '00000000-0000-4000-8000-000000009405', '00000000-0000-4000-8000-000000009401', 'QA9406');
  insert into public.payments (id, registration_id, amount)
  values
    ('00000000-0000-4000-8000-000000009404', '00000000-0000-4000-8000-000000009403', 100),
    ('00000000-0000-4000-8000-000000009407', '00000000-0000-4000-8000-000000009406', 200);

  select changed into v_changed from public.review_payment(
    '00000000-0000-4000-8000-000000009404',
    '00000000-0000-4000-8000-000000009403',
    'confirm'
  );
  if v_changed is not true then raise exception 'first_confirm_must_change'; end if;

  select changed into v_changed from public.review_payment(
    '00000000-0000-4000-8000-000000009404',
    '00000000-0000-4000-8000-000000009403',
    'confirm'
  );
  if v_changed is not false then raise exception 'repeat_confirm_must_be_idempotent'; end if;

  if not exists (
    select 1 from public.payments p
    join public.registrations r on r.id = p.registration_id
    where p.id = '00000000-0000-4000-8000-000000009404'
      and p.status = 'paid' and p.paid_at is not null and r.status = 'confirmed'
  ) then raise exception 'confirm_state_mismatch'; end if;

  select changed into v_changed from public.review_payment(
    '00000000-0000-4000-8000-000000009407',
    '00000000-0000-4000-8000-000000009406',
    'reject'
  );
  if v_changed is not true then raise exception 'first_reject_must_change'; end if;

  select changed into v_changed from public.review_payment(
    '00000000-0000-4000-8000-000000009407',
    '00000000-0000-4000-8000-000000009406',
    'reject'
  );
  if v_changed is not false then raise exception 'repeat_reject_must_be_idempotent'; end if;

  begin
    perform public.review_payment(
      '00000000-0000-4000-8000-000000009404',
      '00000000-0000-4000-8000-000000009406',
      'confirm'
    );
    raise exception 'mismatched_registration_was_accepted';
  exception when others then
    if sqlerrm <> 'payment_registration_mismatch' then raise; end if;
  end;

  insert into public.notifications (user_id, channel, type, status, dedupe_key)
  values (v_user_id, 'email', 'qa_dedupe', 'queued', 'qa:notification:9401');
  insert into public.notifications (user_id, channel, type, status, dedupe_key)
  values (v_user_id, 'email', 'qa_dedupe', 'queued', 'qa:notification:9401')
  on conflict do nothing;
  select count(*) into v_count from public.notifications
  where user_id = v_user_id and channel = 'email' and type = 'qa_dedupe'
    and dedupe_key = 'qa:notification:9401';
  if v_count <> 1 then raise exception 'notification_dedupe_failed'; end if;

  insert into public.rewards (id, name, cost_points, stock)
  values ('00000000-0000-4000-8000-000000009408', 'QA last reward', 50, 1);
  insert into public.points_ledger (user_id, delta, reason, ref_type, ref_id)
  values (v_user_id, 100, 'qa_credit', 'reward', '00000000-0000-4000-8000-000000009408');
  perform set_config('request.jwt.claim.sub', v_user_id::text, true);
  perform public.redeem_reward('00000000-0000-4000-8000-000000009408');

  begin
    perform public.redeem_reward('00000000-0000-4000-8000-000000009408');
    raise exception 'out_of_stock_redemption_was_accepted';
  exception when others then
    if sqlerrm <> 'out_of_stock' then raise; end if;
  end;

  select stock into v_stock from public.rewards
  where id = '00000000-0000-4000-8000-000000009408';
  select count(*) into v_count from public.redemptions
  where reward_id = '00000000-0000-4000-8000-000000009408';
  select coalesce(sum(delta), 0) into v_points from public.points_ledger
  where ref_id = '00000000-0000-4000-8000-000000009408';
  if v_stock <> 0 or v_count <> 1 or v_points <> 50 then
    raise exception 'reward_atomicity_failed stock=% count=% points=%', v_stock, v_count, v_points;
  end if;
end;
$$;

rollback;
