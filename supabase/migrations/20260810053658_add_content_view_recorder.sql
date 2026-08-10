create or replace function public.record_content_article_view(
  p_article_id uuid,
  p_visitor_id uuid,
  p_view_date date,
  p_device_type text,
  p_referrer_host text
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  inserted_rows integer;
begin
  if p_device_type not in ('desktop', 'mobile', 'tablet', 'bot', 'unknown') then
    p_device_type := 'unknown';
  end if;

  insert into public.content_article_views (
    article_id,
    visitor_id,
    view_date,
    device_type,
    referrer_host
  )
  select
    articles.id,
    p_visitor_id,
    p_view_date,
    p_device_type,
    nullif(left(p_referrer_host, 255), '')
  from public.content_articles as articles
  where articles.id = p_article_id
    and articles.status = 'published'
    and articles.published_at is not null
    and articles.published_at <= now()
  on conflict (article_id, visitor_id, view_date)
  do update set
    view_count = public.content_article_views.view_count + 1,
    last_viewed_at = now(),
    device_type = excluded.device_type,
    referrer_host = coalesce(excluded.referrer_host, public.content_article_views.referrer_host);

  get diagnostics inserted_rows = row_count;
  return inserted_rows > 0;
end;
$$;

revoke all on function public.record_content_article_view(
  uuid,
  uuid,
  date,
  text,
  text
) from public, anon, authenticated;

grant execute on function public.record_content_article_view(
  uuid,
  uuid,
  date,
  text,
  text
) to service_role;
