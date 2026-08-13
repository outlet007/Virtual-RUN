create or replace function public.register_for_event(
  p_package_id uuid,
  p_shipping_address jsonb default null
)
returns table (
  registration_id uuid,
  requires_payment boolean
)
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

  select * into v_package
  from public.packages
  where id = p_package_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'package_not_found';
  end if;

  select * into v_event
  from public.events
  where id = v_package.event_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'event_not_found';
  end if;

  if v_event.status <> 'open'
     or v_event.end_date < (now() at time zone 'Asia/Bangkok')::date then
    raise exception using errcode = '23514', message = 'event_registration_closed';
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
    id, user_id, package_id, event_id, shipping_address, status
  ) values (
    v_registration_id,
    v_user_id,
    v_package.id,
    v_package.event_id,
    v_shipping,
    case when v_is_free then 'confirmed' else 'pending' end
  );

  if not v_is_free then
    insert into public.payments (
      registration_id, amount, method, status, charge_ref
    ) values (
      v_registration_id,
      v_package.price,
      'promptpay',
      'pending',
      'VR-' || left(v_registration_id::text, 8)
    );
  end if;

  return query select v_registration_id, not v_is_free;
end;
$$;

revoke all on function public.register_for_event(uuid, jsonb) from public;
revoke all on function public.register_for_event(uuid, jsonb) from anon;
grant execute on function public.register_for_event(uuid, jsonb) to authenticated;

drop policy if exists "own regs insert" on public.registrations;
drop policy if exists "own regs update" on public.registrations;
drop policy if exists "own payments insert" on public.payments;

revoke insert, update on public.registrations from anon, authenticated;
revoke insert on public.payments from anon, authenticated;
