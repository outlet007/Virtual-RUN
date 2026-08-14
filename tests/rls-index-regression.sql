\set ON_ERROR_STOP on

do $$
declare
  v_count integer;
  v_missing_indexes text[];
begin
  select count(*)
  into v_count
  from pg_policies
  where schemaname in ('public', 'storage')
    and (coalesce(qual, '') || ' ' || coalesce(with_check, '')) ~ 'auth[.]uid[(][)]'
    and (coalesce(qual, '') || ' ' || coalesce(with_check, '')) !~ 'SELECT auth[.]uid[(][)]';

  if v_count <> 0 then
    raise exception 'unoptimized_auth_uid_policies: %', v_count;
  end if;

  select count(*)
  into v_count
  from pg_policies
  where schemaname in ('public', 'storage')
    and (coalesce(qual, '') || ' ' || coalesce(with_check, '')) ~ 'auth[.]uid[(][)]'
    and roles <> array['authenticated'::name];

  if v_count <> 0 then
    raise exception 'auth_uid_policies_without_authenticated_target: %', v_count;
  end if;

  with foreign_keys as (
    select constraint_row.oid, constraint_row.conrelid, constraint_row.conkey
    from pg_constraint constraint_row
    where constraint_row.contype = 'f'
      and constraint_row.connamespace = 'public'::regnamespace
  )
  select count(*)
  into v_count
  from foreign_keys
  where not exists (
    select 1
    from pg_index index_row
    where index_row.indrelid = foreign_keys.conrelid
      and index_row.indisvalid
      and index_row.indisready
      and (index_row.indkey::smallint[])[0:cardinality(foreign_keys.conkey) - 1]
        @> foreign_keys.conkey
  );

  if v_count <> 0 then
    raise exception 'unindexed_public_foreign_keys: %', v_count;
  end if;

  select array_agg(expected.index_name order by expected.index_name)
  into v_missing_indexes
  from (
    values
      ('consents_user_id_type_idx'),
      ('events_status_end_date_idx'),
      ('events_status_start_date_idx'),
      ('hero_banners_active_sort_idx'),
      ('payments_status_id_idx'),
      ('points_ledger_user_id_idx'),
      ('redemptions_reward_id_idx'),
      ('redemptions_status_idx'),
      ('redemptions_user_id_idx'),
      ('registrations_event_id_registered_at_idx'),
      ('registrations_package_id_idx'),
      ('registrations_status_registered_at_idx'),
      ('submissions_status_activity_date_idx'),
      ('user_medals_medal_id_idx'),
      ('users_created_at_idx')
  ) as expected(index_name)
  where to_regclass('public.' || expected.index_name) is null;

  if v_missing_indexes is not null then
    raise exception 'missing_expected_indexes: %', v_missing_indexes;
  end if;
end
$$;

select 'rls-index-regression-ok' as result;
