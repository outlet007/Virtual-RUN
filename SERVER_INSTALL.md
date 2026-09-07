# Virtual RUN server installation

This guide is for the production server deployment of the `version-3.7`
branch. The application listens on host port `8025` and connects to an
existing self-hosted Supabase deployment through its public HTTPS API URL.

## Files the administrator needs

- The GitHub repository on branch `version-3.7`
- A completed `.env`, created from `.env.server.example`
- `docker-compose.server.yml` from the repository
- `docs/supabase-selfhosted.env.example` as the safe Supabase port reference
- The separate encrypted data bundle, only when database/Auth/Storage data
  still needs to be restored

The real `.env` and the data bundle contain secrets or personal data. Do not
commit either of them to GitHub.

## 1. Clone the application

```bash
cd /webserver
git clone --branch version-3.7 --single-branch \
  https://github.com/outlet007/Virtual-RUN.git vrrun_bu_ac_th
cd /webserver/vrrun_bu_ac_th
```

If the repository already exists:

```bash
cd /webserver/vrrun_bu_ac_th
git fetch origin
git switch version-3.7
git pull --ff-only origin version-3.7
```

## 2. Configure the self-hosted PostgreSQL port

The application and Supabase are two separate Docker Compose projects. They
therefore use two different real `.env` files:

- `/webserver/vrrun_bu_ac_th/.env` configures the Virtual RUN application.
- `<supabase-selfhosted>/.env` configures the Supabase services (Database,
  Auth, REST, Storage, Realtime, Gateway, Studio, and Pooler).

The example files committed to this repository are templates only. Do not run
the development and production application Compose files at the same time;
both application variants use host port `8025`.

In the extracted Supabase self-hosted directory, create the real `.env` from
its bundled `.env.example`, then set the session-mode PostgreSQL port to:

```dotenv
POSTGRES_PORT=5432
```

This is the host/external port. The expected mapping is host `5432` to
container `5432`, matching the default PostgreSQL port. Keep the internal
PostgreSQL and Supavisor container ports on `5432` as well.

The repository copy at `docs/supabase-selfhosted.env.example` records this
deployment-specific value without containing any secret. Keep the production
Supabase `.env` outside Git and restrict direct database access with the host
firewall.

After recreating the Supabase stack, verify the effective session-mode mapping
from the self-hosted Supabase directory:

```bash
docker compose port supavisor 5432
```

The command must report host port `5432` (for example,
`0.0.0.0:5432` or `[::]:5432`). `docker compose ps` should also show
`5432/tcp` for the database container; that is internal container metadata
and is expected.

## 3. Install the production application environment file

Place the completed file at:

```text
/webserver/vrrun_bu_ac_th/.env
```

Then protect it:

```bash
cd /webserver/vrrun_bu_ac_th
chmod 600 .env
```

The Supabase administrator can obtain the preferred application keys from the
self-hosted Supabase directory without sending them through chat:

```bash
sh run.sh secrets
```

Map `SUPABASE_PUBLISHABLE_KEY` to
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and map `SUPABASE_SECRET_KEY` to the
application variable with the same name. The secret key is server-only.

## 4. Validate required settings without printing secrets

```bash
for key in SITE_URL NEXT_PUBLIC_SITE_URL NEXT_PUBLIC_SUPABASE_URL SUPABASE_URL NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY SUPABASE_SECRET_KEY TURNSTILE_SITE_KEY TURNSTILE_SECRET_KEY SMTP_SETTINGS_ENCRYPTION_KEY; do
  grep -Eq "^${key}=.+" .env || echo "MISSING: ${key}"
done

docker compose \
  -f docker-compose.yml \
  -f docker-compose.server.yml \
  config --quiet
```

Resolve every `MISSING` line before continuing. A legacy Supabase deployment
may use `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` instead
of the preferred key pair.

`SMTP_SETTINGS_ENCRYPTION_KEY` must be a private random value of at least 32
characters. Keep the same value across restarts; changing it makes an existing
Backend-managed SMTP password unreadable until the password is entered again.

## 5. Apply the version-3.7 SMTP migration

Run the migration once from the application repository while the Supabase
Database container is healthy:

```bash
docker exec -i supabase-db psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
  < supabase/migrations/20260907075311_smtp_settings.sql
```

The migration enables RLS, removes all browser-role grants, and grants access
only to the server-side `service_role`. After deployment, a `super_admin` can
save and test SMTP at `/admin/settings`; the password is encrypted before it
is stored and is never returned to the browser.

## 6. Build and start

```bash
docker compose \
  -f docker-compose.yml \
  -f docker-compose.server.yml \
  up -d --build
```

The public Supabase URL and publishable key are embedded into the Next.js
client during the build. Rebuild the image after changing either value.

## 7. Verify

```bash
docker compose \
  -f docker-compose.yml \
  -f docker-compose.server.yml \
  ps

curl --fail --head http://127.0.0.1:8025
```

If startup or the HTTP check fails:

```bash
docker compose \
  -f docker-compose.yml \
  -f docker-compose.server.yml \
  logs --tail 100
```

After the local check succeeds, configure the HTTPS reverse proxy for the app
domain to forward to `127.0.0.1:8025`. Also verify login, Auth redirect URLs,
Storage access, and administrator flows against the restored Supabase data.
