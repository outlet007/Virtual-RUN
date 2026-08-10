create or replace function public.get_content_analytics_overview()
returns table (
  total_views bigint,
  unique_visitors bigint,
  views_30d bigint,
  unique_visitors_30d bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    coalesce(sum(views.view_count), 0)::bigint as total_views,
    count(distinct views.visitor_id)::bigint as unique_visitors,
    coalesce(
      sum(views.view_count) filter (
        where views.view_date >= (timezone('Asia/Bangkok', now())::date - 29)
      ),
      0
    )::bigint as views_30d,
    count(
      distinct views.visitor_id
    ) filter (
      where views.view_date >= (timezone('Asia/Bangkok', now())::date - 29)
    )::bigint as unique_visitors_30d
  from public.content_article_views as views;
$$;

create or replace function public.get_content_daily_analytics(
  p_start_date date,
  p_end_date date
)
returns table (
  view_date date,
  views bigint,
  unique_visitors bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with days as (
    select generate_series(p_start_date, p_end_date, interval '1 day')::date as view_date
  ),
  daily as (
    select
      article_views.view_date,
      sum(article_views.view_count)::bigint as views,
      count(distinct article_views.visitor_id)::bigint as unique_visitors
    from public.content_article_views as article_views
    where article_views.view_date between p_start_date and p_end_date
    group by article_views.view_date
  )
  select
    days.view_date,
    coalesce(daily.views, 0)::bigint,
    coalesce(daily.unique_visitors, 0)::bigint
  from days
  left join daily using (view_date)
  order by days.view_date;
$$;

create or replace function public.get_content_top_articles(
  p_start_date date,
  p_limit integer default 10
)
returns table (
  article_id uuid,
  title text,
  slug text,
  status text,
  views bigint,
  unique_visitors bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    articles.id,
    articles.title,
    articles.slug,
    articles.status,
    coalesce(sum(article_views.view_count), 0)::bigint as views,
    count(distinct article_views.visitor_id)::bigint as unique_visitors
  from public.content_articles as articles
  left join public.content_article_views as article_views
    on article_views.article_id = articles.id
    and article_views.view_date >= p_start_date
  group by articles.id, articles.title, articles.slug, articles.status
  order by views desc, unique_visitors desc, articles.updated_at desc
  limit greatest(1, least(p_limit, 100));
$$;

create or replace function public.get_content_device_analytics(
  p_start_date date
)
returns table (
  device_type text,
  views bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    article_views.device_type,
    sum(article_views.view_count)::bigint as views
  from public.content_article_views as article_views
  where article_views.view_date >= p_start_date
  group by article_views.device_type
  order by views desc, article_views.device_type;
$$;

create or replace function public.get_content_referrer_analytics(
  p_start_date date,
  p_limit integer default 10
)
returns table (
  referrer_host text,
  views bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    article_views.referrer_host,
    sum(article_views.view_count)::bigint as views
  from public.content_article_views as article_views
  where article_views.view_date >= p_start_date
    and article_views.referrer_host is not null
    and article_views.referrer_host <> ''
  group by article_views.referrer_host
  order by views desc, article_views.referrer_host
  limit greatest(1, least(p_limit, 100));
$$;

revoke all on function public.get_content_analytics_overview() from public, anon, authenticated;
revoke all on function public.get_content_daily_analytics(date, date) from public, anon, authenticated;
revoke all on function public.get_content_top_articles(date, integer) from public, anon, authenticated;
revoke all on function public.get_content_device_analytics(date) from public, anon, authenticated;
revoke all on function public.get_content_referrer_analytics(date, integer) from public, anon, authenticated;

grant execute on function public.get_content_analytics_overview() to service_role;
grant execute on function public.get_content_daily_analytics(date, date) to service_role;
grant execute on function public.get_content_top_articles(date, integer) to service_role;
grant execute on function public.get_content_device_analytics(date) to service_role;
grant execute on function public.get_content_referrer_analytics(date, integer) to service_role;
