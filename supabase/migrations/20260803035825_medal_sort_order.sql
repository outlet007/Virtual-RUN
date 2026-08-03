-- Admin-defined display order for digital medals within each event.
alter table public.medals
  add column sort_order integer not null default 0
    check (sort_order >= 0);

with ranked as (
  select
    id,
    row_number() over (
      partition by event_id
      order by coalesce((unlock_rule->>'target_km')::numeric, 0), name, id
    )::integer as position
  from public.medals
)
update public.medals
set sort_order = ranked.position
from ranked
where public.medals.id = ranked.id;

create index medals_event_sort_order_idx
  on public.medals (event_id, sort_order, id);
