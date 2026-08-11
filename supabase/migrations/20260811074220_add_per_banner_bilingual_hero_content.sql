alter table public.hero_banners
  add column kicker text,
  add column kicker_en text,
  add column highlight text,
  add column highlight_en text,
  add column title_suffix text,
  add column title_suffix_en text;

update public.hero_banners as banner
set
  kicker = settings.home_hero_kicker,
  kicker_en = settings.home_hero_kicker_en,
  title = settings.home_hero_title,
  title_en = settings.home_hero_title_en,
  highlight = settings.home_hero_highlight,
  highlight_en = settings.home_hero_highlight_en,
  title_suffix = settings.home_hero_suffix,
  title_suffix_en = settings.home_hero_suffix_en,
  subtitle = settings.home_hero_description,
  subtitle_en = settings.home_hero_description_en
from public.system_settings as settings
where settings.id = 1;

update public.hero_banners
set
  kicker = coalesce(kicker, 'Run · Walk · Collect'),
  kicker_en = coalesce(kicker_en, 'Run · Walk · Collect'),
  title = coalesce(title, 'วิ่งที่ไหน เมื่อไหร่ก็ได้'),
  title_en = coalesce(title_en, 'Run Anywhere, Anytime'),
  highlight = coalesce(highlight, 'เก็บทุกกิโลเมตร'),
  highlight_en = coalesce(highlight_en, 'Turn Every Kilometer'),
  title_suffix = coalesce(title_suffix, 'ให้เป็นเหรียญ'),
  title_suffix_en = coalesce(title_suffix_en, 'into a Medal'),
  subtitle = coalesce(
    subtitle,
    'สมัครงาน เชื่อม Strava หรืออัปโหลดผลเอง ระบบรวมระยะให้อัตโนมัติ ครบเป้าเมื่อไหร่ ปลดล็อกเหรียญเมื่อนั้น'
  ),
  subtitle_en = coalesce(
    subtitle_en,
    'Join an event, connect Strava, or upload a result. We track your distance and unlock medals when you reach your goal.'
  );

alter table public.hero_banners
  alter column kicker set default 'Run · Walk · Collect',
  alter column kicker set not null,
  alter column kicker_en set default 'Run · Walk · Collect',
  alter column kicker_en set not null,
  alter column title set default 'วิ่งที่ไหน เมื่อไหร่ก็ได้',
  alter column title set not null,
  alter column title_en set default 'Run Anywhere, Anytime',
  alter column title_en set not null,
  alter column highlight set default 'เก็บทุกกิโลเมตร',
  alter column highlight set not null,
  alter column highlight_en set default 'Turn Every Kilometer',
  alter column highlight_en set not null,
  alter column title_suffix set default 'ให้เป็นเหรียญ',
  alter column title_suffix set not null,
  alter column title_suffix_en set default 'into a Medal',
  alter column title_suffix_en set not null,
  alter column subtitle set default
    'สมัครงาน เชื่อม Strava หรืออัปโหลดผลเอง ระบบรวมระยะให้อัตโนมัติ ครบเป้าเมื่อไหร่ ปลดล็อกเหรียญเมื่อนั้น',
  alter column subtitle set not null,
  alter column subtitle_en set default
    'Join an event, connect Strava, or upload a result. We track your distance and unlock medals when you reach your goal.',
  alter column subtitle_en set not null,
  add constraint hero_banners_kicker_length_check
    check (char_length(kicker) between 1 and 120),
  add constraint hero_banners_kicker_en_length_check
    check (char_length(kicker_en) between 1 and 120),
  add constraint hero_banners_title_length_check
    check (char_length(title) between 1 and 160),
  add constraint hero_banners_title_en_length_check
    check (char_length(title_en) between 1 and 160),
  add constraint hero_banners_highlight_length_check
    check (char_length(highlight) between 1 and 160),
  add constraint hero_banners_highlight_en_length_check
    check (char_length(highlight_en) between 1 and 160),
  add constraint hero_banners_title_suffix_length_check
    check (char_length(title_suffix) between 1 and 160),
  add constraint hero_banners_title_suffix_en_length_check
    check (char_length(title_suffix_en) between 1 and 160),
  add constraint hero_banners_subtitle_length_check
    check (char_length(subtitle) between 1 and 1000),
  add constraint hero_banners_subtitle_en_length_check
    check (char_length(subtitle_en) between 1 and 1000);
