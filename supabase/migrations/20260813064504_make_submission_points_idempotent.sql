-- Synchronize distance points for one submission under a transaction-scoped
-- advisory lock. Repeated or concurrent approve/revoke calls converge on the
-- same target balance instead of inserting duplicate points.

create or replace function public.sync_submission_distance_points(
  p_submission_id uuid,
  p_approved boolean
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_distance_km numeric;
  v_current_points integer;
  v_target_points integer;
  v_adjustment integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_submission_id::text, 0));

  select user_id, distance_km
  into v_user_id, v_distance_km
  from public.submissions
  where id = p_submission_id;

  if not found then
    raise exception 'submission_not_found';
  end if;

  select coalesce(sum(delta), 0)::integer
  into v_current_points
  from public.points_ledger
  where user_id = v_user_id
    and ref_type = 'submission'
    and ref_id = p_submission_id;

  v_target_points := case when p_approved then round(v_distance_km)::integer else 0 end;
  v_adjustment := v_target_points - v_current_points;

  if v_adjustment <> 0 then
    insert into public.points_ledger (user_id, delta, reason, ref_type, ref_id)
    values (
      v_user_id,
      v_adjustment,
      case when v_adjustment > 0 then 'distance' else 'distance_reversal' end,
      'submission',
      p_submission_id
    );
  end if;

  return v_adjustment;
end;
$$;

revoke all on function public.sync_submission_distance_points(uuid, boolean) from public;
revoke all on function public.sync_submission_distance_points(uuid, boolean) from anon;
revoke all on function public.sync_submission_distance_points(uuid, boolean) from authenticated;
grant execute on function public.sync_submission_distance_points(uuid, boolean) to service_role;