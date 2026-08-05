-- Store the focal point used by homepage hero banner images.
-- Values map directly to CSS object-position percentages.
alter table public.hero_banners
  add column position_x smallint not null default 50
    check (position_x between 0 and 100),
  add column position_y smallint not null default 50
    check (position_y between 0 and 100);