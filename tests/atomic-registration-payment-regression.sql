\set ON_ERROR_STOP on
begin;

select id as qa_user_id from public.users order by created_at limit 1 \gset

insert into public.events (id, title, pricing, start_date, end_date, status)
values
  ('00000000-0000-4000-8000-000000009501', 'QA free registration', 'free', current_date, current_date + 1, 'open'),
  ('00000000-0000-4000-8000-000000009502', 'QA paid registration', 'paid', current_date, current_date + 1, 'open'),
  ('00000000-0000-4000-8000-000000009503', 'QA closed registration', 'paid', current_date - 2, current_date - 1, 'closed');

insert into public.packages (id, event_id, name, target_distance_km, price, has_physical_medal)
values
  ('00000000-0000-4000-8000-000000009511', '00000000-0000-4000-8000-000000009501', 'QA free digital', 5, 0, false),
  ('00000000-0000-4000-8000-000000009512', '00000000-0000-4000-8000-000000009502', 'QA paid physical', 10, 250, true),
  ('00000000-0000-4000-8000-000000009513', '00000000-0000-4000-8000-000000009502', 'QA payment failure', 15, 350, false),
  ('00000000-0000-4000-8000-000000009514', '00000000-0000-4000-8000-000000009503', 'QA closed', 20, 450, false);

select set_config('request.jwt.claim.sub', :'qa_user_id', true);
set local role authenticated;

do $$
declare
  v_user_id uuid := auth.uid();
  v_registration_id uuid;
  v_requires_payment boolean;
  v_count integer;
begin
  if has_function_privilege('anon', 'public.register_for_event(uuid,jsonb)', 'execute') then
    raise exception 'anon_must_not_execute_register_for_event';
  end if;
  if not has_function_privilege('authenticated', 'public.register_for_event(uuid,jsonb)', 'execute') then
    raise exception 'authenticated_must_execute_register_for_event';
  end if;
  if has_table_privilege('authenticated', 'public.registrations', 'insert')
     or has_table_privilege('authenticated', 'public.registrations', 'update')
     or has_table_privilege('authenticated', 'public.payments', 'insert') then
    raise exception 'direct_registration_or_payment_write_must_be_denied';
  end if;

  select registration_id, requires_payment
  into v_registration_id, v_requires_payment
  from public.register_for_event(
    '00000000-0000-4000-8000-000000009511',
    '{}'::jsonb
  );
  if v_requires_payment then raise exception 'free_package_requires_payment'; end if;
  if not exists (
    select 1 from public.registrations
    where id = v_registration_id and user_id = v_user_id
      and status = 'confirmed' and bib_number is not null
  ) then raise exception 'free_registration_state_invalid'; end if;
  if exists (select 1 from public.payments where registration_id = v_registration_id) then
    raise exception 'free_registration_created_payment';
  end if;

  select registration_id, requires_payment
  into v_registration_id, v_requires_payment
  from public.register_for_event(
    '00000000-0000-4000-8000-000000009512',
    '{"recipient":"QA Runner","phone":"0800000000","address":"1 QA Road","province":"Bangkok","postal_code":"10100"}'::jsonb
  );
  if not v_requires_payment then raise exception 'paid_package_does_not_require_payment'; end if;
  if not exists (
    select 1 from public.registrations
    where id = v_registration_id and user_id = v_user_id and status = 'pending'
  ) then raise exception 'paid_registration_state_invalid'; end if;
  if not exists (
    select 1 from public.payments
    where registration_id = v_registration_id and amount = 250
      and status = 'pending' and charge_ref = 'VR-' || left(v_registration_id::text, 8)
  ) then raise exception 'paid_registration_payment_invalid'; end if;

  begin
    perform public.register_for_event(
      '00000000-0000-4000-8000-000000009512', '{}'::jsonb
    );
    raise exception 'missing_shipping_was_accepted';
  exception when check_violation then
    if sqlerrm <> 'shipping_address_required' then raise; end if;
  end;

  begin
    perform public.register_for_event(
      '00000000-0000-4000-8000-000000009514', '{}'::jsonb
    );
    raise exception 'closed_event_was_accepted';
  exception when check_violation then
    if sqlerrm <> 'event_registration_closed' then raise; end if;
  end;

  select count(*) into v_count
  from public.registrations
  where user_id = v_user_id
    and package_id in (
      '00000000-0000-4000-8000-000000009511',
      '00000000-0000-4000-8000-000000009512',
      '00000000-0000-4000-8000-000000009513',
      '00000000-0000-4000-8000-000000009514'
    );
  if v_count <> 2 then raise exception 'unexpected_registration_count=%', v_count; end if;
end;
$$;

reset role;

create function public.qa_fail_payment_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'qa_payment_failure';
end;
$$;

create trigger qa_fail_payment_insert
before insert on public.payments
for each row execute function public.qa_fail_payment_insert();

set local role authenticated;

do $$
declare
  v_user_id uuid := auth.uid();
begin
  begin
    perform public.register_for_event(
      '00000000-0000-4000-8000-000000009513', '{}'::jsonb
    );
    raise exception 'forced_payment_failure_was_accepted';
  exception when others then
    if sqlerrm <> 'qa_payment_failure' then raise; end if;
  end;

  if exists (
    select 1 from public.registrations
    where user_id = v_user_id
      and package_id = '00000000-0000-4000-8000-000000009513'
  ) then raise exception 'registration_was_not_rolled_back_after_payment_failure'; end if;
end;
$$;

reset role;
rollback;
