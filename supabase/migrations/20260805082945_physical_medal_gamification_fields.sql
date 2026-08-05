alter table public.physical_medals
  add column tier text not null default 'bronze'
    check (tier in ('bronze', 'silver', 'gold', 'legendary')),
  add column unlock_rule jsonb not null default '{"type":"distance","target_km":1}'::jsonb,
  add column bonus_points integer not null default 0;

comment on column public.physical_medals.tier is
  'Display tier matching the digital medal catalog.';

comment on column public.physical_medals.unlock_rule is
  'Physical medal target rule, stored in the same shape as digital medals.';

comment on column public.physical_medals.bonus_points is
  'Bonus points configured for the physical medal.';