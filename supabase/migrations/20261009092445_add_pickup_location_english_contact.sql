alter table public.reward_pickup_locations
  add column contact_phone_en text;

alter table public.reward_pickup_locations
  add constraint reward_pickup_locations_contact_phone_en_length_check
  check (contact_phone_en is null or char_length(contact_phone_en) <= 50);

create or replace function public.redeem_reward(
  p_reward_id uuid,
  p_fulfillment_method text default 'shipping'
)
returns public.redemptions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_reward public.rewards%rowtype;
  v_location public.reward_pickup_locations%rowtype;
  v_balance bigint;
  v_address jsonb;
  v_location_snapshot jsonb;
  v_redemption public.redemptions%rowtype;
begin
  if v_user_id is null then raise exception 'not_authenticated'; end if;
  if p_fulfillment_method not in ('pickup', 'shipping') then
    raise exception 'invalid_fulfillment_method';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(v_user_id::text));

  select * into v_reward from public.rewards where id = p_reward_id for update;
  if not found then raise exception 'reward_not_found'; end if;
  if v_reward.stock <= 0 then raise exception 'out_of_stock'; end if;

  if p_fulfillment_method = 'pickup' then
    if not v_reward.allows_pickup or v_reward.pickup_location_id is null then
      raise exception 'fulfillment_method_not_available';
    end if;

    select * into v_location
    from public.reward_pickup_locations
    where id = v_reward.pickup_location_id and is_active;
    if not found then raise exception 'pickup_location_not_available'; end if;

    v_location_snapshot := jsonb_strip_nulls(jsonb_build_object(
      'id', v_location.id,
      'name', v_location.name,
      'name_en', v_location.name_en,
      'address', v_location.address,
      'address_en', v_location.address_en,
      'contact_phone', v_location.contact_phone,
      'contact_phone_en', v_location.contact_phone_en,
      'maps_url', v_location.maps_url,
      'instructions', v_location.instructions,
      'instructions_en', v_location.instructions_en
    ));
  else
    if not v_reward.allows_shipping then raise exception 'fulfillment_method_not_available'; end if;

    select jsonb_strip_nulls(jsonb_build_object(
      'recipient', name,
      'phone', phone,
      'address', address,
      'province', province,
      'postal_code', postal_code
    )) into v_address
    from public.users
    where id = v_user_id
      and nullif(btrim(address), '') is not null
      and nullif(btrim(province), '') is not null
      and nullif(btrim(postal_code), '') is not null;
    if v_address is null then raise exception 'shipping_address_required'; end if;
  end if;

  select coalesce(sum(delta), 0) into v_balance
  from public.points_ledger where user_id = v_user_id;
  if v_balance < v_reward.cost_points then raise exception 'insufficient_points'; end if;

  insert into public.redemptions (
    user_id, reward_id, points_spent, status, fulfillment_method,
    pickup_location_id, pickup_location_snapshot, shipping_address
  ) values (
    v_user_id, v_reward.id, v_reward.cost_points, 'pending', p_fulfillment_method,
    case when p_fulfillment_method = 'pickup' then v_location.id else null end,
    v_location_snapshot, v_address
  ) returning * into v_redemption;

  insert into public.points_ledger (user_id, delta, reason, ref_type, ref_id)
  values (v_user_id, -v_reward.cost_points, 'redemption', 'reward', v_reward.id);

  update public.rewards set stock = stock - 1 where id = v_reward.id;
  return v_redemption;
end;
$$;

revoke execute on function public.redeem_reward(uuid, text) from public, anon;
grant execute on function public.redeem_reward(uuid, text) to authenticated;
