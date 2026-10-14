-- Add event-scoped cumulative distance levels without changing the existing
-- package target workflow. Existing events remain single_target by default.

alter table public.events
  add column event_mode text not null default 'single_target',
  add constraint events_event_mode_check
    check (event_mode in ('single_target', 'distance_levels'));

alter table public.registrations
  add column event_mode text not null default 'single_target',
  add constraint registrations_event_mode_check
    check (event_mode in ('single_target', 'distance_levels'));

create table public.event_distance_levels (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  name_en text,
  target_distance_km numeric(8,2) not null,
  sort_order integer not null default 0,
  digital_medal_id uuid references public.medals(id) on delete set null,
  reward_description text,
  reward_description_en text,
  bonus_points integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_distance_levels_name_length
    check (char_length(btrim(name)) between 1 and 100),
  constraint event_distance_levels_name_en_length
    check (name_en is null or char_length(btrim(name_en)) between 1 and 100),
  constraint event_distance_levels_target_range
    check (target_distance_km > 0 and target_distance_km <= 1000000),
  constraint event_distance_levels_sort_order_range
    check (sort_order between 0 and 9999),
  constraint event_distance_levels_bonus_points_range
    check (bonus_points between 0 and 100000000),
  constraint event_distance_levels_event_target_unique
    unique (event_id, target_distance_km)
);

create table public.registration_distance_level_achievements (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.registrations(id) on delete cascade,
  level_id uuid not null references public.event_distance_levels(id) on delete restrict,
  user_id uuid not null references public.users(id) on delete cascade,
  awarded_points integer not null default 0,
  achieved_at timestamptz not null default now(),
  constraint registration_distance_level_achievement_unique
    unique (registration_id, level_id),
  constraint registration_distance_level_awarded_points_range
    check (awarded_points between 0 and 100000000)
);

create index event_distance_levels_event_order_idx
  on public.event_distance_levels (event_id, sort_order, target_distance_km);
create index event_distance_levels_digital_medal_id_idx
  on public.event_distance_levels (digital_medal_id)
  where digital_medal_id is not null;
create index registration_distance_level_achievements_user_idx
  on public.registration_distance_level_achievements (user_id, achieved_at desc);
create index registration_distance_level_achievements_level_idx
  on public.registration_distance_level_achievements (level_id);

create unique index registrations_one_active_distance_level_event_idx
  on public.registrations (user_id, event_id)
  where event_mode = 'distance_levels'
    and status in ('pending', 'confirmed');

create or replace function public.validate_event_distance_level()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_event_mode text;
  v_medal_event_id uuid;
begin
  select event_mode into v_event_mode
  from public.events
  where id = new.event_id;

  if v_event_mode is distinct from 'distance_levels' then
    raise exception using errcode = '23514', message = 'distance_level_event_required';
  end if;

  if new.digital_medal_id is not null then
    select event_id into v_medal_event_id
    from public.medals
    where id = new.digital_medal_id;
    if v_medal_event_id is distinct from new.event_id then
      raise exception using errcode = '23514', message = 'distance_level_medal_event_mismatch';
    end if;
  end if;

  new.name := btrim(new.name);
  new.name_en := nullif(btrim(new.name_en), '');
  new.reward_description := nullif(btrim(new.reward_description), '');
  new.reward_description_en := nullif(btrim(new.reward_description_en), '');
  new.updated_at := now();
  return new;
end;
$$;

-- Replace the atomic registration RPC so cumulative-level events accept only
-- one active registration per participant and cannot open without levels.
create or replace function public.register_for_event(
  p_package_id uuid,
  p_shipping_address jsonb default null
)
returns table (registration_id uuid, requires_payment boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_package public.packages%rowtype;
  v_event public.events%rowtype;
  v_registration_id uuid := gen_random_uuid();
  v_is_free boolean;
  v_shipping jsonb;
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'not_authenticated';
  end if;

  select * into v_package from public.packages where id = p_package_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'package_not_found';
  end if;
  select * into v_event from public.events where id = v_package.event_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'event_not_found';
  end if;

  if v_event.status <> 'open'
     or v_event.end_date < (now() at time zone 'Asia/Bangkok')::date then
    raise exception using errcode = '23514', message = 'event_registration_closed';
  end if;

  if v_event.event_mode = 'distance_levels' then
    if not exists (
      select 1 from public.event_distance_levels where event_id = v_event.id
    ) then
      raise exception using errcode = '23514', message = 'distance_levels_required';
    end if;
    if exists (
      select 1 from public.registrations
      where user_id = v_user_id
        and event_id = v_event.id
        and status in ('pending', 'confirmed')
    ) then
      raise exception using errcode = '23505', message = 'event_registration_exists';
    end if;
  end if;

  if v_package.has_physical_medal then
    if jsonb_typeof(p_shipping_address) <> 'object'
       or nullif(btrim(p_shipping_address->>'recipient'), '') is null
       or nullif(btrim(p_shipping_address->>'phone'), '') is null
       or nullif(btrim(p_shipping_address->>'address'), '') is null
       or nullif(btrim(p_shipping_address->>'province'), '') is null
       or nullif(btrim(p_shipping_address->>'postal_code'), '') is null then
      raise exception using errcode = '23514', message = 'shipping_address_required';
    end if;
    v_shipping := p_shipping_address;
  else
    v_shipping := null;
  end if;

  v_is_free := v_event.pricing = 'free' or v_package.price = 0;
  insert into public.registrations (
    id, user_id, package_id, event_id, shipping_address, status, event_mode
  ) values (
    v_registration_id, v_user_id, v_package.id, v_package.event_id, v_shipping,
    case when v_is_free then 'confirmed' else 'pending' end, v_event.event_mode
  );

  if not v_is_free then
    insert into public.payments (registration_id, amount, method, status, charge_ref)
    values (
      v_registration_id, v_package.price, 'promptpay', 'pending',
      'VR-' || left(v_registration_id::text, 8)
    );
  end if;

  return query select v_registration_id, not v_is_free;
end;
$$;

create trigger validate_event_distance_level_before_write
  before insert or update on public.event_distance_levels
  for each row execute function public.validate_event_distance_level();

create or replace function public.lock_event_mode_after_registration()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.event_mode is distinct from new.event_mode
     and exists (select 1 from public.registrations where event_id = old.id) then
    raise exception using errcode = '23514', message = 'event_mode_locked_after_registration';
  end if;
  return new;
end;
$$;

create trigger lock_event_mode_after_registration_before_update
  before update of event_mode on public.events
  for each row execute function public.lock_event_mode_after_registration();

create or replace function public.set_registration_event_mode()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_event_mode text;
  v_package_event_id uuid;
begin
  select event_id into v_package_event_id
  from public.packages
  where id = new.package_id;
  if v_package_event_id is distinct from new.event_id then
    raise exception using errcode = '23514', message = 'registration_package_event_mismatch';
  end if;

  select event_mode into v_event_mode
  from public.events
  where id = new.event_id;
  if v_event_mode is null then
    raise exception using errcode = 'P0002', message = 'event_not_found';
  end if;

  new.event_mode := v_event_mode;
  return new;
end;
$$;

create trigger set_registration_event_mode_before_write
  before insert or update of event_id, package_id on public.registrations
  for each row execute function public.set_registration_event_mode();

create or replace function public.sync_registration_distance_levels(
  p_registration_id uuid
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_registration public.registrations%rowtype;
  v_cumulative_km numeric;
  v_level record;
  v_achievement_id uuid;
  v_new_count integer := 0;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_registration_id::text, 1));
  select * into v_registration
  from public.registrations
  where id = p_registration_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'registration_not_found';
  end if;
  if v_registration.event_mode <> 'distance_levels'
     or v_registration.status <> 'confirmed' then
    return 0;
  end if;

  select coalesce(sum(distance_km), 0) into v_cumulative_km
  from public.submissions
  where registration_id = p_registration_id
    and status = 'approved';

  for v_level in
    select id, digital_medal_id, bonus_points
    from public.event_distance_levels
    where event_id = v_registration.event_id
      and target_distance_km <= v_cumulative_km
    order by sort_order, target_distance_km, id
  loop
    v_achievement_id := null;
    insert into public.registration_distance_level_achievements (
      registration_id, level_id, user_id, awarded_points
    ) values (
      v_registration.id, v_level.id, v_registration.user_id, v_level.bonus_points
    )
    on conflict (registration_id, level_id) do nothing
    returning id into v_achievement_id;

    if v_achievement_id is null then
      continue;
    end if;
    v_new_count := v_new_count + 1;

    if v_level.bonus_points > 0 then
      insert into public.points_ledger (user_id, delta, reason, ref_type, ref_id)
      values (
        v_registration.user_id, v_level.bonus_points,
        'distance_level_bonus', 'event_distance_level', v_level.id
      );
    end if;

    if v_level.digital_medal_id is not null then
      insert into public.user_medals (user_id, medal_id)
      values (v_registration.user_id, v_level.digital_medal_id)
      on conflict (user_id, medal_id) do nothing;
    end if;
  end loop;

  return v_new_count;
end;
$$;

alter table public.event_distance_levels enable row level security;
alter table public.registration_distance_level_achievements enable row level security;

create policy public_reads_levels_for_published_events
on public.event_distance_levels
for select
to anon, authenticated
using (
  exists (
    select 1 from public.events
    where events.id = event_distance_levels.event_id
      and events.status in ('open', 'closed')
  )
);

create policy users_read_own_distance_level_achievements
on public.registration_distance_level_achievements
for select
to authenticated
using ((select auth.uid()) = user_id);

revoke all on table public.event_distance_levels from public, anon, authenticated;
grant select on table public.event_distance_levels to anon, authenticated;
grant all on table public.event_distance_levels to service_role;
revoke all on table public.registration_distance_level_achievements from public, anon, authenticated;
grant select on table public.registration_distance_level_achievements to authenticated;
grant all on table public.registration_distance_level_achievements to service_role;

revoke all on function public.sync_registration_distance_levels(uuid) from public, anon, authenticated;
grant execute on function public.sync_registration_distance_levels(uuid) to service_role;
revoke all on function public.register_for_event(uuid, jsonb) from public, anon;
grant execute on function public.register_for_event(uuid, jsonb) to authenticated;
