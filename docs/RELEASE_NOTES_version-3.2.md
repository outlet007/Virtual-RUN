# Virtual-RUN - Release Notes version 3.2

## Release Metadata

- Branch: `version-3.2`
- Commit message: `Release version 3.2 - RLS performance and credential boundary hardening`
- Base release: `version-3.1`
- Date: 2026-08-14 (Asia/Bangkok)

## Security and RLS

- Resolved all 19 Supabase Auth RLS Initialization Plan warnings with `(select auth.uid())`.
- Optimized six user-owned Storage policies and restricted four Storage management policies to authenticated users.
- Added explicit ownership checks for profile, Strava connection, and avatar updates.
- Kept elevated Supabase, SMTP, LINE, PromptPay, Strava, OCR, and Turnstile modules server-only.
- Verified that static client assets contain no server-secret environment variable names.
- No API key was rotated, replaced, or configured as part of this release.

## Database Performance

- Resolved all seven application-owned unindexed foreign-key findings.
- Added indexes for repeated public event, hero banner, submission, payment, registration, redemption, and member queries.
- Added repeatable RLS/index database regression coverage.

## Compatibility

- Added optional support for modern Supabase publishable and secret key variable names.
- Retained existing anon/service-role fallbacks for local development and existing deployments.
- No environment credential value is committed to the repository.

## Verification

- TypeScript passed.
- Unit tests passed 72/72 across 19 test files.
- Supabase Local migration history contains 50 entries.
- Database lint found no schema errors.
- Database Advisors found no WARN or ERROR findings.
- RLS/index and transactional SQL regressions passed.
- Production Docker build passed.
- Container `Virtual-RUN` is running on port 3000.
- `http://localhost:3000` returns HTTP 200 and startup logs are clean.

## Deployment State at Release

- All migrations are verified against Supabase Local.
- Hosted staging deployment and online integration QA follow after this release commit.
- No paid service was created or enabled.
