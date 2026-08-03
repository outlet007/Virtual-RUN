-- Store the focal point used by the event detail hero image.
-- Values map directly to CSS object-position percentages.
alter table public.events
  add column cover_position_x smallint not null default 50
    check (cover_position_x between 0 and 100),
  add column cover_position_y smallint not null default 50
    check (cover_position_y between 0 and 100);
