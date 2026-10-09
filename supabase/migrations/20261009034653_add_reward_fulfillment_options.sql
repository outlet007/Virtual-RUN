create table public.reward_pickup_locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_en text,
  address text not null,
  address_en text,
  contact_phone text,
  maps_url text,
  instructions text,
  instructions_en text,
  is_primary boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reward_pickup_locations_name_length_check check (char_length(btrim(name)) between 1 and 200),
  constraint reward_pickup_locations_address_length_check check (char_length(btrim(address)) between 1 and 1000),
  constraint reward_pickup_locations_primary_active_check check (not is_primary or is_active)
);

alter table public.reward_pickup_locations
  add constraint reward_pickup_locations_name_en_length_check check (name_en is null or char_length(name_en) <= 200),
  add constraint reward_pickup_locations_address_en_length_check check (address_en is null or char_length(address_en) <= 1000),
  add constraint reward_pickup_locations_contact_phone_length_check check (contact_phone is null or char_length(contact_phone) <= 50),
  add constraint reward_pickup_locations_maps_url_length_check check (maps_url is null or char_length(maps_url) <= 2000);

alter table public.reward_pickup_locations
  add constraint reward_pickup_locations_instructions_length_check check (instructions is null or char_length(instructions) <= 1000),
  add constraint reward_pickup_locations_instructions_en_length_check check (instructions_en is null or char_length(instructions_en) <= 1000);

create unique index reward_pickup_locations_one_primary_idx
  on public.reward_pickup_locations (is_primary) where is_primary;

alter table public.reward_pickup_locations enable row level security;
revoke all on table public.reward_pickup_locations from anon, authenticated;
grant select on table public.reward_pickup_locations to anon, authenticated;

create policy active_reward_pickup_locations_read
  on public.reward_pickup_locations for select to anon, authenticated
  using (is_active);

alter table public.rewards
  add column pickup_location_id uuid references public.reward_pickup_locations(id) on delete restrict,
  add column allows_pickup boolean not null default false,
  add column allows_shipping boolean not null default true,
  add constraint rewards_fulfillment_method_check check (allows_pickup or allows_shipping),
  add constraint rewards_pickup_location_required_check check (not allows_pickup or pickup_location_id is not null);

create index rewards_pickup_location_id_idx on public.rewards (pickup_location_id);

alter table public.redemptions
  add column fulfillment_method text not null default 'shipping'
    constraint redemptions_fulfillment_method_check check (fulfillment_method in ('pickup', 'shipping')),
  add column pickup_location_id uuid references public.reward_pickup_locations(id) on delete set null,
  add column pickup_location_snapshot jsonb,
  add column shipping_address jsonb,
  add column redeemed_at timestamptz not null default now(),
  add column fulfilled_at timestamptz,
  add constraint redemptions_fulfillment_details_check
    check (
      (fulfillment_method = 'pickup' and pickup_location_snapshot is not null and shipping_address is null)
      or
      (fulfillment_method = 'shipping' and shipping_address is not null and pickup_location_snapshot is null)
    ) not valid;

create index redemptions_pickup_location_id_idx on public.redemptions (pickup_location_id);
create index redemptions_fulfillment_method_status_idx on public.redemptions (fulfillment_method, status);

update public.redemptions redemption
set shipping_address = jsonb_strip_nulls(jsonb_build_object(
  'recipient', profile.name,
  'phone', profile.phone,
  'address', profile.address,
  'province', profile.province,
  'postal_code', profile.postal_code
))
from public.users profile
where profile.id = redemption.user_id
  and redemption.shipping_address is null;

alter table public.redemptions
  validate constraint redemptions_fulfillment_details_check;

create or replace function public.set_primary_reward_pickup_location(p_location_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.reward_pickup_locations
    where id = p_location_id and is_active
  ) then
    raise exception 'pickup_location_not_found';
  end if;

  update public.reward_pickup_locations
  set is_primary = false, updated_at = now()
  where is_primary and id <> p_location_id;

  update public.reward_pickup_locations
  set is_primary = true, updated_at = now()
  where id = p_location_id;
end;
$$;

revoke execute on function public.set_primary_reward_pickup_location(uuid) from public, anon, authenticated;
grant execute on function public.set_primary_reward_pickup_location(uuid) to service_role;

drop function if exists public.redeem_reward(uuid);

create function public.redeem_reward(
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
