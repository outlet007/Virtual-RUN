create or replace function public.validate_registration_event_open()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  package_event_id uuid;
  event_status text;
  event_end_date date;
begin
  select packages.event_id, events.status, events.end_date
    into package_event_id, event_status, event_end_date
  from public.packages
  join public.events on events.id = packages.event_id
  where packages.id = new.package_id;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'registration package or event not found';
  end if;

  if new.event_id <> package_event_id then
    raise exception using
      errcode = '23514',
      message = 'registration event does not match package event';
  end if;

  if event_status <> 'open'
     or event_end_date is null
     or event_end_date < (now() at time zone 'Asia/Bangkok')::date then
    raise exception using
      errcode = '23514',
      message = 'event registration is closed';
  end if;

  return new;
end;
$$;

revoke all on function public.validate_registration_event_open() from public, anon, authenticated;

create trigger validate_registration_event_open_before_insert
before insert or update of package_id, event_id on public.registrations
for each row
execute function public.validate_registration_event_open();
