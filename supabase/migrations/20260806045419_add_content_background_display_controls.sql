alter table public.system_settings
  add column content_background_position_x smallint not null default 50,
  add column content_background_position_y smallint not null default 50,
  add column content_background_display text not null default 'cover';

alter table public.system_settings
  add constraint system_settings_content_background_position_x_range
    check (content_background_position_x between 0 and 100),
  add constraint system_settings_content_background_position_y_range
    check (content_background_position_y between 0 and 100),
  add constraint system_settings_content_background_display_allowed
    check (
      content_background_display in (
        'cover', 'contain', 'stretch', 'auto', 'repeat', 'repeat-x', 'repeat-y'
      )
    );
