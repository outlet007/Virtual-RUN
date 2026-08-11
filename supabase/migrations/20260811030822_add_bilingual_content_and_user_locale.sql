-- Optional English copies keep existing Thai content backward compatible.
-- When an English value is null, the application falls back to Thai.
alter table public.users
  add column preferred_language text not null default 'th'
    constraint users_preferred_language_check check (preferred_language in ('th', 'en'));

grant update (preferred_language) on public.users to authenticated;

alter table public.events
  add column title_en text,
  add column description_en text;

alter table public.packages
  add column name_en text;

alter table public.medals
  add column name_en text;

alter table public.physical_medals
  add column name_en text,
  add column description_en text;

alter table public.rewards
  add column name_en text,
  add column description_en text;

alter table public.levels
  add column name_en text;

alter table public.hero_banners
  add column title_en text,
  add column subtitle_en text;

alter table public.system_settings
  add column site_name_en text,
  add column cookie_consent_message_en text,
  add column cookie_consent_button_label_en text;

alter table public.content_categories
  add column name_en text,
  add column description_en text,
  add constraint content_categories_name_en_length_check
    check (name_en is null or char_length(name_en) between 1 and 120),
  add constraint content_categories_description_en_length_check
    check (description_en is null or char_length(description_en) <= 500);

alter table public.content_articles
  add column title_en text,
  add column excerpt_en text,
  add column content_html_en text,
  add column cta_label_en text,
  add column seo_title_en text,
  add column seo_description_en text,
  add constraint content_articles_title_en_length_check
    check (title_en is null or char_length(title_en) between 1 and 240),
  add constraint content_articles_excerpt_en_length_check
    check (excerpt_en is null or char_length(excerpt_en) <= 500),
  add constraint content_articles_cta_label_en_length_check
    check (cta_label_en is null or char_length(cta_label_en) between 1 and 80),
  add constraint content_articles_seo_title_en_length_check
    check (seo_title_en is null or char_length(seo_title_en) <= 240),
  add constraint content_articles_seo_description_en_length_check
    check (seo_description_en is null or char_length(seo_description_en) <= 500);

comment on column public.users.preferred_language is
  'Preferred UI/content locale. Cookie is used for guests and as the immediate browser preference.';
