alter table public.system_settings
  add column home_hero_kicker text not null default 'Run · Walk · Collect',
  add column home_hero_kicker_en text not null default 'Run · Walk · Collect',
  add column home_hero_title text not null default 'วิ่งที่ไหน เมื่อไหร่ก็ได้',
  add column home_hero_title_en text not null default 'Run Anywhere, Anytime',
  add column home_hero_highlight text not null default 'เก็บทุกกิโลเมตร',
  add column home_hero_highlight_en text not null default 'Turn Every Kilometer',
  add column home_hero_suffix text not null default 'ให้เป็นเหรียญ',
  add column home_hero_suffix_en text not null default 'into a Medal',
  add column home_hero_description text not null default
    'สมัครงาน เชื่อม Strava หรืออัปโหลดผลเอง ระบบรวมระยะให้อัตโนมัติ ครบเป้าเมื่อไหร่ ปลดล็อกเหรียญเมื่อนั้น',
  add column home_hero_description_en text not null default
    'Join an event, connect Strava, or upload a result. We track your distance and unlock medals when you reach your goal.',
  add constraint system_settings_home_hero_kicker_length_check
    check (char_length(home_hero_kicker) between 1 and 120),
  add constraint system_settings_home_hero_kicker_en_length_check
    check (char_length(home_hero_kicker_en) between 1 and 120),
  add constraint system_settings_home_hero_title_length_check
    check (char_length(home_hero_title) between 1 and 160),
  add constraint system_settings_home_hero_title_en_length_check
    check (char_length(home_hero_title_en) between 1 and 160),
  add constraint system_settings_home_hero_highlight_length_check
    check (char_length(home_hero_highlight) between 1 and 160),
  add constraint system_settings_home_hero_highlight_en_length_check
    check (char_length(home_hero_highlight_en) between 1 and 160),
  add constraint system_settings_home_hero_suffix_length_check
    check (char_length(home_hero_suffix) between 1 and 160),
  add constraint system_settings_home_hero_suffix_en_length_check
    check (char_length(home_hero_suffix_en) between 1 and 160),
  add constraint system_settings_home_hero_description_length_check
    check (char_length(home_hero_description) between 1 and 1000),
  add constraint system_settings_home_hero_description_en_length_check
    check (char_length(home_hero_description_en) between 1 and 1000);
