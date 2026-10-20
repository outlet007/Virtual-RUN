\set ON_ERROR_STOP on
begin;

-- รางวัลที่ถูกซ่อนต้องแลกไม่ได้แม้เรียก RPC ตรง; รางวัลที่แสดงยังแลกได้ตามปกติ
do $$
declare
  v_user_id uuid;
  v_rejected boolean := false;
  v_stock integer;
begin
  select id into v_user_id from public.users order by created_at limit 1;
  if v_user_id is null then raise exception 'qa_requires_existing_user'; end if;

  insert into public.rewards (id, name, cost_points, stock, allows_pickup, allows_shipping)
  values ('00000000-0000-4000-8000-000000009601', 'QA new reward', 10, 3, false, true);

  if not (select is_active from public.rewards where id = '00000000-0000-4000-8000-000000009601') then
    raise exception 'reward_must_default_to_visible';
  end if;

  update public.rewards set is_active = false where id = '00000000-0000-4000-8000-000000009601';
  insert into public.points_ledger (user_id, delta, reason, ref_type, ref_id)
  values (v_user_id, 100, 'qa_credit', 'reward', '00000000-0000-4000-8000-000000009601');
  perform set_config('request.jwt.claim.sub', v_user_id::text, true);

  begin
    perform public.redeem_reward('00000000-0000-4000-8000-000000009601', 'shipping');
  exception when others then
    if sqlerrm <> 'reward_not_available' then
      raise exception 'unexpected hidden reward error: %', sqlerrm;
    end if;
    v_rejected := true;
  end;
  if not v_rejected then raise exception 'hidden_reward_must_not_be_redeemable'; end if;

  select stock into v_stock from public.rewards where id = '00000000-0000-4000-8000-000000009601';
  if v_stock <> 3 then raise exception 'hidden_reward_stock_must_not_change: %', v_stock; end if;

  -- เปิดแสดงอีกครั้งแล้วต้องผ่านการตรวจ is_active (จะไปติดเงื่อนไขอื่นต่อได้ เช่นที่อยู่จัดส่ง)
  update public.rewards set is_active = true where id = '00000000-0000-4000-8000-000000009601';
  begin
    perform public.redeem_reward('00000000-0000-4000-8000-000000009601', 'shipping');
  exception when others then
    if sqlerrm = 'reward_not_available' then
      raise exception 'visible_reward_must_pass_visibility_check';
    end if;
  end;

  if has_function_privilege('anon', 'public.redeem_reward(uuid,text)', 'execute') then
    raise exception 'anon_must_not_execute_redeem_reward';
  end if;
end;
$$;

rollback;
