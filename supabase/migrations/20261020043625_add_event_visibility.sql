-- Let admins hide an event from everyone except admins (like a draft, but
-- independent of status). Hidden events disappear from public pages and from
-- applicants' dashboards through RLS, and new registrations and run submissions
-- are rejected in the database. Existing events stay visible.

alter table public.events
  add column is_visible boolean not null default true;

drop policy "events public read" on public.events;
create policy "events public read" on public.events
  for select using (status in ('open', 'closed') and is_visible);

drop policy public_reads_levels_for_published_events on public.event_distance_levels;
create policy public_reads_levels_for_published_events
on public.event_distance_levels
for select
to anon, authenticated
using (
  exists (
    select 1 from public.events
    where events.id = event_distance_levels.event_id
      and events.status in ('open', 'closed')
      and events.is_visible
  )
);

-- Same body as 20260806055705 plus the is_visible check.
create or replace function public.validate_registration_event_open()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  package_event_id uuid;
  event_status text;
  event_end_date date;
  event_visible boolean;
begin
  select packages.event_id, events.status, events.end_date, events.is_visible
    into package_event_id, event_status, event_end_date, event_visible
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
     or not event_visible
     or event_end_date is null
     or event_end_date < (now() at time zone 'Asia/Bangkok')::date then
    raise exception using
      errcode = '23514',
      message = 'event registration is closed';
  end if;

  return new;
end;
$$;

-- Run submissions (upload and Strava both insert through create_guarded_submission)
-- are rejected while the event is hidden.
create or replace function public.reject_submission_for_hidden_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.registrations as registrations
    join public.events as events on events.id = registrations.event_id
    where registrations.id = new.registration_id
      and not events.is_visible
  ) then
    raise exception using errcode = '42501', message = 'event_not_available';
  end if;
  return new;
end;
$$;

revoke all on function public.reject_submission_for_hidden_event() from public, anon, authenticated;

create trigger reject_submission_for_hidden_event_before_insert
before insert on public.submissions
for each row
execute function public.reject_submission_for_hidden_event();
