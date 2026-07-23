-- ============================================================
-- แก้ race condition ของ redeemReward — เดิม read stock/balance แล้ว insert/update
-- แยกกันหลาย query ทำให้สอง request พร้อมกันแลกของชิ้นสุดท้ายได้ทั้งคู่ หรือใช้แต้มเกินยอดได้
-- ย้าย logic ทั้งหมดเข้า Postgres function เดียว ให้รันในทรานแซกชันเดียวพร้อม lock
-- ============================================================

create or replace function public.redeem_reward(p_reward_id uuid)
returns public.redemptions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id   uuid := auth.uid();
  v_reward    public.rewards%rowtype;
  v_balance   bigint;
  v_redemption public.redemptions%rowtype;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  -- serialize การแลกของ user คนเดียวกัน กันแลกสองรางวัลพร้อมกันแล้วใช้แต้มเกิน
  perform pg_advisory_xact_lock(hashtext(v_user_id::text));

  -- lock แถวรางวัลไว้ กันสอง request แข่งกันแลกของชิ้นสุดท้าย
  select * into v_reward from public.rewards where id = p_reward_id for update;
  if not found then
    raise exception 'reward_not_found';
  end if;
  if v_reward.stock <= 0 then
    raise exception 'out_of_stock';
  end if;

  select coalesce(sum(delta), 0) into v_balance
  from public.points_ledger where user_id = v_user_id;
  if v_balance < v_reward.cost_points then
    raise exception 'insufficient_points';
  end if;

  insert into public.redemptions (user_id, reward_id, points_spent, status)
  values (v_user_id, v_reward.id, v_reward.cost_points, 'pending')
  returning * into v_redemption;

  insert into public.points_ledger (user_id, delta, reason, ref_type, ref_id)
  values (v_user_id, -v_reward.cost_points, 'redemption', 'reward', v_reward.id);

  update public.rewards set stock = stock - 1 where id = v_reward.id;

  return v_redemption;
end;
$$;

grant execute on function public.redeem_reward(uuid) to authenticated;
