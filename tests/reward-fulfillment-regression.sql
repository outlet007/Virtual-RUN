\set ON_ERROR_STOP on
begin;

do $$
declare
  v_user_id uuid;
  v_method text;
  v_location_name text;
  v_contact_phone_en text;
begin
  select id into v_user_id from public.users order by created_at limit 1;
  if v_user_id is null then raise exception 'qa_requires_existing_user'; end if;

  insert into public.reward_pickup_locations (
    id, name, address, contact_phone, contact_phone_en, is_primary, is_active
  ) values (
    '00000000-0000-4000-8000-000000009501',
    'QA Pickup',
    'QA Address',
    '02-111-1111',
    '+66 2 111 1111',
    false,
    true
  );

  insert into public.rewards (
    id, name, cost_points, stock, pickup_location_id, allows_pickup, allows_shipping
  ) values (
    '00000000-0000-4000-8000-000000009502',
    'QA pickup reward',
    25,
    1,
    '00000000-0000-4000-8000-000000009501',
    true,
    false
  );

  insert into public.points_ledger (user_id, delta, reason, ref_type, ref_id)
  values (v_user_id, 25, 'qa_credit', 'reward', '00000000-0000-4000-8000-000000009502');
  perform set_config('request.jwt.claim.sub', v_user_id::text, true);
  perform public.redeem_reward('00000000-0000-4000-8000-000000009502', 'pickup');

  select fulfillment_method, pickup_location_snapshot->>'name', pickup_location_snapshot->>'contact_phone_en'
  into v_method, v_location_name, v_contact_phone_en
  from public.redemptions
  where reward_id = '00000000-0000-4000-8000-000000009502';

  if v_method <> 'pickup' or v_location_name <> 'QA Pickup' or v_contact_phone_en <> '+66 2 111 1111' then
    raise exception 'pickup_snapshot_failed method=% location=% contact_phone_en=%', v_method, v_location_name, v_contact_phone_en;
  end if;

  if has_function_privilege('anon', 'public.redeem_reward(uuid,text)', 'execute') then
    raise exception 'anon_must_not_execute_redeem_reward';
  end if;
  if not has_function_privilege('authenticated', 'public.redeem_reward(uuid,text)', 'execute') then
    raise exception 'authenticated_must_execute_redeem_reward';
  end if;
end;
$$;

rollback;
