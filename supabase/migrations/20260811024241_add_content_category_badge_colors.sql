alter table public.content_categories
  add column badge_background_color text not null default '#FEC81D',
  add column badge_text_color text not null default '#1C1C1C',
  add constraint content_categories_badge_background_color_format_check
    check (badge_background_color ~ '^#[0-9A-Fa-f]{6}$'),
  add constraint content_categories_badge_text_color_format_check
    check (badge_text_color ~ '^#[0-9A-Fa-f]{6}$');

comment on column public.content_categories.badge_background_color is
  'Hex background color used by public article category badges.';

comment on column public.content_categories.badge_text_color is
  'Hex text color used by public article category badges.';
