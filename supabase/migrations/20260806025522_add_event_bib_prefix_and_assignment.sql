alter table public.events
  add column bib_prefix text not null default 'VR';

update public.events
set bib_prefix = 'VR'
where bib_prefix is null or btrim(bib_prefix) = '';

alter table public.events
  add constraint events_bib_prefix_format_check
  check (bib_prefix ~ '^[A-Z0-9]{2,8}$');

do $$
begin
  if exists (
    select 1
    from public.registrations
    where bib_number is not null
    group by bib_number
    having count(*) > 1
  ) then
    raise exception 'Cannot enforce unique BIB numbers: duplicate bib_number values exist';
  end if;
end
$$;

create unique index registrations_bib_number_key
  on public.registrations (bib_number)
  where bib_number is not null;

create sequence public.registration_bib_seq start with 100000;

select setval(
  'public.registration_bib_seq',
  greatest(
    100000,
    coalesce(
      (
        select max((regexp_match(bib_number, '([0-9]+)$'))[1]::bigint) + 1
        from public.registrations
        where bib_number ~ '[0-9]+$'
      ),
      100000
    )
  ),
  false
);

create schema if not exists private;
revoke all on schema private from public;

create or replace function private.assign_registration_bib()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  event_bib_prefix text;
begin
  if new.status = 'confirmed' and new.bib_number is null then
    select events.bib_prefix
      into event_bib_prefix
      from public.events
      where events.id = new.event_id;

    if event_bib_prefix is null then
      raise exception 'Cannot assign BIB: event % was not found', new.event_id;
    end if;

    new.bib_number := event_bib_prefix || lpad(
      nextval('public.registration_bib_seq'::regclass)::text,
      6,
      '0'
    );
  end if;

  return new;
end;
$$;

revoke all on function private.assign_registration_bib() from public;

create trigger assign_registration_bib_before_confirm
before insert or update of status on public.registrations
for each row
execute function private.assign_registration_bib();

update public.registrations
set status = status
where status = 'confirmed' and bib_number is null;

comment on column public.events.bib_prefix is
  'Uppercase 2-8 character prefix used when assigning BIB numbers for this event.';
