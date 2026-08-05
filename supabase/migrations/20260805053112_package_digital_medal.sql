alter table public.packages
  add column digital_medal_id uuid
    references public.medals(id) on delete set null;

create index packages_digital_medal_id_idx
  on public.packages (digital_medal_id)
  where digital_medal_id is not null;

comment on column public.packages.digital_medal_id is
  'Optional digital medal displayed as included with this package.';
