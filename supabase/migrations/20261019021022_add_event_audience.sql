-- Restrict event registration by applicant group using the university email domain.
-- Existing and new events default to 'all', so current behavior is unchanged.
-- Both domains are Google Workspace and email/password sign-up does not verify
-- email ownership, so restricted audiences only trust emails of a linked Google
-- identity (auth.identities provider = 'google').
--   all           : everyone
--   staff         : @bu.ac.th
--   student       : @bumail.net
--   staff_student : @bu.ac.th or @bumail.net

alter table public.events
  add column audience text not null default 'all',
  add constraint events_audience_check
    check (audience in ('all', 'staff', 'student', 'staff_student'));

-- Pure domain rule kept in one place so registration and tests share it.
create or replace function public.email_matches_event_audience(
  p_email text,
  p_audience text
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case coalesce(p_audience, 'all')
    when 'all' then true
    when 'staff' then lower(btrim(coalesce(p_email, ''))) like '%@bu.ac.th'
    when 'student' then lower(btrim(coalesce(p_email, ''))) like '%@bumail.net'
    when 'staff_student' then
      lower(btrim(coalesce(p_email, ''))) like '%@bu.ac.th'
      or lower(btrim(coalesce(p_email, ''))) like '%@bumail.net'
    else false
  end;
$$;

revoke all on function public.email_matches_event_audience(text, text) from public, anon;
grant execute on function public.email_matches_event_audience(text, text) to authenticated, service_role;

-- Same body as 20261014024232 plus the audience check. The email is read from
-- the user's Google identity in auth.identities (never public.users, which users
-- may update themselves, nor an unverified email/password sign-up).
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

  if v_event.audience <> 'all' and not exists (
    select 1
    from auth.identities i
    where i.user_id = v_user_id
      and i.provider = 'google'
      and public.email_matches_event_audience(i.identity_data->>'email', v_event.audience)
  ) then
    raise exception using errcode = '42501', message = 'event_audience_not_allowed';
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

revoke all on function public.register_for_event(uuid, jsonb) from public, anon;
grant execute on function public.register_for_event(uuid, jsonb) to authenticated;
