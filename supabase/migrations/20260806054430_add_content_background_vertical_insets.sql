alter table public.system_settings
  add column content_background_inset_top smallint not null default 0,
  add column content_background_inset_bottom smallint not null default 0;

alter table public.system_settings
  add constraint system_settings_content_background_inset_top_range
    check (content_background_inset_top between 0 and 2000),
  add constraint system_settings_content_background_inset_bottom_range
    check (content_background_inset_bottom between 0 and 2000);
