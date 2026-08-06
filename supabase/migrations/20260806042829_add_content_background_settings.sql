alter table public.system_settings
  add column content_background_url text,
  add column content_overlay_color text not null default '#FAFAF8',
  add column content_overlay_opacity smallint not null default 0;

alter table public.system_settings
  add constraint system_settings_content_overlay_color_format
    check (content_overlay_color ~ '^#[0-9A-Fa-f]{6}$'),
  add constraint system_settings_content_overlay_opacity_range
    check (content_overlay_opacity between 0 and 100);
