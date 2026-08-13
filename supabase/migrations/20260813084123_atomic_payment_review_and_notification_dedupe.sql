alter table public.notifications
  add column if not exists dedupe_key text;

create unique index if not exists notifications_delivery_dedupe_unique
  on public.notifications (user_id, channel, type, dedupe_key)
  where dedupe_key is not null;

create unique index if not exists payments_registration_id_unique
  on public.payments (registration_id);

create or replace function public.review_payment(
  p_payment_id uuid,
  p_registration_id uuid,
  p_decision text
)
returns table (
  user_id uuid,
  bib_number text,
  changed boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payment public.payments%rowtype;
  v_registration public.registrations%rowtype;
  v_payment_target text;
  v_registration_target text;
begin
  if p_decision not in ('confirm', 'reject') then
    raise exception 'invalid_payment_decision';
  end if;

  select * into v_payment
  from public.payments
  where id = p_payment_id
  for update;

  if not found then
    raise exception 'payment_not_found';
  end if;

  if v_payment.registration_id <> p_registration_id then
    raise exception 'payment_registration_mismatch';
  end if;

  select * into v_registration
  from public.registrations
  where id = p_registration_id
  for update;

  if not found then
    raise exception 'registration_not_found';
  end if;

  if p_decision = 'confirm' then
    v_payment_target := 'paid';
    v_registration_target := 'confirmed';
  else
    v_payment_target := 'failed';
    v_registration_target := 'cancelled';
  end if;

  if v_payment.status = v_payment_target
     and v_registration.status = v_registration_target then
    return query
      select v_registration.user_id, v_registration.bib_number, false;
    return;
  end if;

  if v_payment.status not in ('pending', v_payment_target)
     or v_registration.status not in ('pending', v_registration_target) then
    raise exception 'payment_already_reviewed';
  end if;

  update public.payments
  set status = v_payment_target,
      paid_at = case
        when p_decision = 'confirm' then coalesce(paid_at, now())
        else null
      end
  where id = p_payment_id;

  update public.registrations
  set status = v_registration_target
  where id = p_registration_id;

  return query
    select v_registration.user_id, v_registration.bib_number, true;
end;
$$;

revoke all on function public.review_payment(uuid, uuid, text) from public;
revoke all on function public.review_payment(uuid, uuid, text) from anon;
revoke all on function public.review_payment(uuid, uuid, text) from authenticated;
grant execute on function public.review_payment(uuid, uuid, text) to service_role;
