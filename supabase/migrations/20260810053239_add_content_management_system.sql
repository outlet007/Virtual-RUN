-- Full content-management system: categories, articles, privacy-preserving analytics.

create table public.content_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_categories_name_length_check
    check (char_length(name) between 1 and 120),
  constraint content_categories_slug_format_check
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint content_categories_description_length_check
    check (description is null or char_length(description) <= 500)
);

create table public.content_articles (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.content_categories(id) on delete set null,
  title text not null,
  slug text not null unique,
  excerpt text,
  content_html text not null default '',
  banner_image_url text,
  banner_position_x smallint not null default 50,
  banner_position_y smallint not null default 50,
  cta_label text,
  cta_url text,
  status text not null default 'draft',
  is_featured boolean not null default false,
  published_at timestamptz,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_articles_title_length_check
    check (char_length(title) between 1 and 240),
  constraint content_articles_slug_format_check
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint content_articles_excerpt_length_check
    check (excerpt is null or char_length(excerpt) <= 500),
  constraint content_articles_banner_position_x_check
    check (banner_position_x between 0 and 100),
  constraint content_articles_banner_position_y_check
    check (banner_position_y between 0 and 100),
  constraint content_articles_cta_check
    check (
      (cta_label is null and cta_url is null)
      or
      (
        cta_label is not null
        and cta_url is not null
        and char_length(cta_label) between 1 and 80
        and char_length(cta_url) <= 2048
      )
    ),
  constraint content_articles_status_check
    check (status in ('draft', 'published', 'archived')),
  constraint content_articles_seo_title_length_check
    check (seo_title is null or char_length(seo_title) <= 240),
  constraint content_articles_seo_description_length_check
    check (seo_description is null or char_length(seo_description) <= 500)
);

-- One aggregate row per anonymous browser/article/Bangkok day.
-- view_count keeps page views while visitor_id supports unique-visitor counts without IP storage.
create table public.content_article_views (
  id bigint generated always as identity primary key,
  article_id uuid not null references public.content_articles(id) on delete cascade,
  visitor_id uuid not null,
  view_date date not null,
  view_count integer not null default 1,
  device_type text not null default 'unknown',
  referrer_host text,
  first_viewed_at timestamptz not null default now(),
  last_viewed_at timestamptz not null default now(),
  constraint content_article_views_unique_visitor_day
    unique (article_id, visitor_id, view_date),
  constraint content_article_views_count_check
    check (view_count > 0),
  constraint content_article_views_device_type_check
    check (device_type in ('desktop', 'mobile', 'tablet', 'bot', 'unknown')),
  constraint content_article_views_referrer_length_check
    check (referrer_host is null or char_length(referrer_host) <= 255)
);

create index content_articles_category_id_idx
  on public.content_articles (category_id);
create index content_articles_published_idx
  on public.content_articles (published_at desc)
  where status = 'published';
create index content_articles_featured_published_idx
  on public.content_articles (published_at desc)
  where status = 'published' and is_featured = true;
create index content_categories_public_order_idx
  on public.content_categories (sort_order, name)
  where is_active = true;
create index content_article_views_article_date_idx
  on public.content_article_views (article_id, view_date desc);
create index content_article_views_date_idx
  on public.content_article_views (view_date desc);
create index content_article_views_visitor_id_idx
  on public.content_article_views (visitor_id);

create or replace function private.set_content_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function private.set_content_updated_at() from public, anon, authenticated;

create trigger content_categories_set_updated_at
before update on public.content_categories
for each row execute function private.set_content_updated_at();

create trigger content_articles_set_updated_at
before update on public.content_articles
for each row execute function private.set_content_updated_at();

alter table public.content_categories enable row level security;
alter table public.content_articles enable row level security;
alter table public.content_article_views enable row level security;

revoke all on table public.content_categories from anon, authenticated;
revoke all on table public.content_articles from anon, authenticated;
revoke all on table public.content_article_views from anon, authenticated;

grant select on table public.content_categories to anon, authenticated;
grant select on table public.content_articles to anon, authenticated;
grant all on table public.content_categories to service_role;
grant all on table public.content_articles to service_role;
grant all on table public.content_article_views to service_role;
grant usage, select on sequence public.content_article_views_id_seq to service_role;

create policy "active content categories public read"
on public.content_categories for select
to anon, authenticated
using (is_active = true);

create policy "published content articles public read"
on public.content_articles for select
to anon, authenticated
using (
  status = 'published'
  and published_at is not null
  and published_at <= now()
);

-- Analytics has no anon/authenticated policy. Only the server-side service role may read/write it.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'content-assets',
  'content-assets',
  true,
  52428800,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'video/mp4', 'video/webm']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "managers manage content assets"
on storage.objects for all
to authenticated
using (
  bucket_id = 'content-assets'
  and exists (
    select 1
    from public.users
    where users.id = (select auth.uid())
      and users.role in ('admin', 'super_admin')
  )
)
with check (
  bucket_id = 'content-assets'
  and exists (
    select 1
    from public.users
    where users.id = (select auth.uid())
      and users.role in ('admin', 'super_admin')
  )
);
