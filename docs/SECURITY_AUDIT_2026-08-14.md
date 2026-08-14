# Security and Performance Audit - 2026-08-14

## Scope

- Optimize RLS policies reported by the Supabase Auth RLS Initialization Plan advisor.
- Audit foreign-key, RLS, and repeated application-query indexes.
- Audit server-only credential boundaries and `NEXT_PUBLIC_*` variables.

## Changes

- Rewrote 19 application RLS policies to cache `(select auth.uid())` and target `authenticated` explicitly.
- Applied the same optimization to six user-owned Storage policies.
- Restricted four Storage management policies to `authenticated`.
- Added explicit update checks for profile, Strava connection, and avatar ownership.
- Added seven foreign-key-covering indexes and eight indexes for repeated public/admin query patterns.
- Added `server-only` guards to modules that read elevated Supabase, SMTP, LINE, PromptPay, Strava, OCR, or Turnstile configuration.
- Added support for modern Supabase publishable/secret keys while retaining local and legacy anon/service-role fallbacks.
- Added static credential-boundary tests and database RLS/index regression coverage.

## Verification

- TypeScript passed.
- Unit tests passed: 72/72 across 19 files.
- Supabase local migration history contains 50 entries.
- Database lint found no schema errors.
- Database Advisors found no WARN or ERROR findings; the previous 19 RLS warnings and seven unindexed-FK findings are resolved.
- RLS/index, payment/reward/notification, and atomic registration/payment SQL regressions passed.
- Production Docker build passed and `Virtual-RUN` is running on port 3000.
- `http://localhost:3000` returns HTTP 200 and startup logs are clean.
- Static client assets contain no server-secret environment variable names.

## External State

- The two 2026-08-14 migrations have only been applied to Supabase local.
- No external Supabase project, paid service, commit, push, or release was created.

## Next Work

1. Apply the pending migrations to a Free staging project only when online or multi-device testing is required.
2. Prefer Supabase publishable and secret keys for a new hosted project; keep legacy keys only for compatibility/local development.
3. Use production query statistics before removing indexes reported as unused in the local development database.
4. Continue live Strava verification only when a public callback is available.

## References

- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/database/database-advisors
- https://supabase.com/docs/guides/getting-started/api-keys
- https://supabase.com/changelog?types=breaking-change
