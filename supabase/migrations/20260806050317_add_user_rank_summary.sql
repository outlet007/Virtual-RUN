create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.get_my_rank_summary()
returns table (
  total_users bigint,
  points bigint,
  points_rank bigint,
  distance_km numeric,
  distance_rank bigint,
  approved_runs bigint,
  approved_runs_rank bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  return query
  with user_stats as (
    select
      u.id,
      coalesce(p.total_points, 0)::bigint as stat_points,
      coalesce(s.total_distance_km, 0)::numeric as stat_distance_km,
      coalesce(s.total_approved_runs, 0)::bigint as stat_approved_runs
    from public.users u
    left join (
      select pl.user_id, sum(pl.delta)::bigint as total_points
      from public.points_ledger pl
      group by pl.user_id
    ) p on p.user_id = u.id
    left join (
      select
        sub.user_id,
        sum(sub.distance_km)::numeric as total_distance_km,
        count(*)::bigint as total_approved_runs
      from public.submissions sub
      where sub.status = 'approved'
      group by sub.user_id
    ) s on s.user_id = u.id
  ), ranked as (
    select
      us.*,
      count(*) over ()::bigint as member_count,
      rank() over (order by us.stat_points desc)::bigint as stat_points_rank,
      rank() over (order by us.stat_distance_km desc)::bigint as stat_distance_rank,
      rank() over (order by us.stat_approved_runs desc)::bigint as stat_runs_rank
    from user_stats us
  )
  select
    r.member_count,
    r.stat_points,
    r.stat_points_rank,
    r.stat_distance_km,
    r.stat_distance_rank,
    r.stat_approved_runs,
    r.stat_runs_rank
  from ranked r
  where r.id = v_user_id;
end;
$$;

revoke all on function private.get_my_rank_summary() from public, anon;
grant execute on function private.get_my_rank_summary() to authenticated;

create or replace function public.get_my_rank_summary()
returns table (
  total_users bigint,
  points bigint,
  points_rank bigint,
  distance_km numeric,
  distance_rank bigint,
  approved_runs bigint,
  approved_runs_rank bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from private.get_my_rank_summary();
$$;

revoke all on function public.get_my_rank_summary() from public, anon;
grant execute on function public.get_my_rank_summary() to authenticated;
