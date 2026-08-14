-- Cache the authenticated user id once per statement instead of evaluating it
-- for every row. Target authenticated explicitly so these ownership policies do
-- not run for anonymous requests.
alter policy "own profile read" on public.users
  to authenticated
  using ((select auth.uid()) = id);

alter policy "own profile update" on public.users
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

alter policy "own regs read" on public.registrations
  to authenticated
  using ((select auth.uid()) = user_id);

alter policy "own subs read" on public.submissions
  to authenticated
  using ((select auth.uid()) = user_id);

alter policy "own subs insert" on public.submissions
  to authenticated
  with check ((select auth.uid()) = user_id);

alter policy "own consents read" on public.consents
  to authenticated
  using ((select auth.uid()) = user_id);

alter policy "own consents insert" on public.consents
  to authenticated
  with check ((select auth.uid()) = user_id);

alter policy "own points read" on public.points_ledger
  to authenticated
  using ((select auth.uid()) = user_id);

alter policy "own medals read" on public.user_medals
  to authenticated
  using ((select auth.uid()) = user_id);

alter policy "own notifs read" on public.notifications
  to authenticated
  using ((select auth.uid()) = user_id);

alter policy "own strava read" on public.strava_connections
  to authenticated
  using ((select auth.uid()) = user_id);

alter policy "own strava insert" on public.strava_connections
  to authenticated
  with check ((select auth.uid()) = user_id);

alter policy "own strava update" on public.strava_connections
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

alter policy "own strava delete" on public.strava_connections
  to authenticated
  using ((select auth.uid()) = user_id);

alter policy "own pending read" on public.strava_pending_activities
  to authenticated
  using ((select auth.uid()) = user_id);

alter policy "own pending delete" on public.strava_pending_activities
  to authenticated
  using ((select auth.uid()) = user_id);

alter policy "own redemptions read" on public.redemptions
  to authenticated
  using ((select auth.uid()) = user_id);

alter policy "own shipments read" on public.shipments
  to authenticated
  using (
    exists (
      select 1
      from public.registrations r
      where r.id = registration_id
        and r.user_id = (select auth.uid())
    )
  );

alter policy "own payments read" on public.payments
  to authenticated
  using (
    exists (
      select 1
      from public.registrations r
      where r.id = registration_id
        and r.user_id = (select auth.uid())
    )
  );

-- Storage ownership policies use the same initPlan optimization. The explicit
-- WITH CHECK on avatar updates prevents moving an object outside the caller's
-- own folder during an update/upsert.
alter policy "own evidence insert" on storage.objects
  to authenticated
  with check (
    bucket_id = 'run-evidence'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

alter policy "own evidence read" on storage.objects
  to authenticated
  using (
    bucket_id = 'run-evidence'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

alter policy "own avatar insert" on storage.objects
  to authenticated
  with check (
    bucket_id = 'user-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

alter policy "own avatar select" on storage.objects
  to authenticated
  using (
    bucket_id = 'user-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

alter policy "own avatar update" on storage.objects
  to authenticated
  using (
    bucket_id = 'user-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'user-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

alter policy "own avatar delete" on storage.objects
  to authenticated
  using (
    bucket_id = 'user-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Cover every application-owned foreign key reported by the performance
-- advisor. Composite indexes keep their FK column first while also serving the
-- application's common filter/order pattern.
create index consents_user_id_type_idx
  on public.consents (user_id, type);

create index points_ledger_user_id_idx
  on public.points_ledger (user_id);

create index redemptions_reward_id_idx
  on public.redemptions (reward_id);

create index redemptions_user_id_idx
  on public.redemptions (user_id);

create index registrations_event_id_registered_at_idx
  on public.registrations (event_id, registered_at desc);

create index registrations_package_id_idx
  on public.registrations (package_id);

create index user_medals_medal_id_idx
  on public.user_medals (medal_id);

-- Repeated public/admin list queries. Keep this set deliberately small; local
-- data is not representative enough to justify speculative covering indexes.
create index events_status_start_date_idx
  on public.events (status, start_date);

create index events_status_end_date_idx
  on public.events (status, end_date desc);

create index hero_banners_active_sort_idx
  on public.hero_banners (sort_order)
  where is_active = true;

create index submissions_status_activity_date_idx
  on public.submissions (status, activity_date desc);

create index payments_status_id_idx
  on public.payments (status, id);

create index registrations_status_registered_at_idx
  on public.registrations (status, registered_at);

create index redemptions_status_idx
  on public.redemptions (status);

create index users_created_at_idx
  on public.users (created_at desc);
