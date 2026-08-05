create table public.physical_medals (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  description text,
  image_url text,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now()
);

create index physical_medals_event_id_sort_order_idx
  on public.physical_medals (event_id, sort_order, created_at);

alter table public.physical_medals enable row level security;

grant select on table public.physical_medals to anon, authenticated;
grant all on table public.physical_medals to service_role;

create policy "physical medals public read"
  on public.physical_medals
  for select
  to anon, authenticated
  using (true);

alter table public.packages
  add column physical_medal_id uuid,
  add constraint packages_physical_medal_id_fkey
    foreign key (physical_medal_id)
    references public.physical_medals(id)
    on delete set null;

create index packages_physical_medal_id_idx
  on public.packages (physical_medal_id)
  where physical_medal_id is not null;

comment on table public.physical_medals is
  'Physical medal catalog scoped to an event and selectable by packages.';

comment on column public.packages.physical_medal_id is
  'Optional physical medal included with this package.';