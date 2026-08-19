-- Admin-defined display order for packages within each event.
alter table public.packages
  add column sort_order integer not null default 0
    check (sort_order >= 0);

with ranked as (
  select
    id,
    row_number() over (
      partition by event_id
      order by created_at, id
    )::integer as position
  from public.packages
)
update public.packages
set sort_order = ranked.position
from ranked
where public.packages.id = ranked.id;

create index packages_event_sort_order_idx
  on public.packages (event_id, sort_order, id);
