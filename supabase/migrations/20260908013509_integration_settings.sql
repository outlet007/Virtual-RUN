-- Runtime integration settings managed from the server-rendered super-admin backend.
-- Secrets are encrypted by the application before they reach this table.
-- Browser roles receive no grants and no RLS policies.

create table public.integration_settings (
  id smallint primary key default 1 check (id = 1),

  strava_source text not null default 'environment'
    check (strava_source in ('environment', 'backend', 'disabled')),
  strava_client_id text not null default '' check (char_length(strava_client_id) <= 255),
  strava_client_secret_ciphertext text,
  strava_webhook_verify_token_ciphertext text,

  line_login_source text not null default 'environment'
    check (line_login_source in ('environment', 'backend', 'disabled')),
  line_login_channel_id text not null default '' check (char_length(line_login_channel_id) <= 255),
  line_login_channel_secret_ciphertext text,

  line_messaging_source text not null default 'environment'
    check (line_messaging_source in ('environment', 'backend', 'disabled')),
  line_channel_access_token_ciphertext text,

  turnstile_source text not null default 'environment'
    check (turnstile_source in ('environment', 'backend', 'disabled')),
  turnstile_site_key text not null default '' check (char_length(turnstile_site_key) <= 255),
  turnstile_secret_key_ciphertext text,
  turnstile_expected_hostname text not null default ''
    check (char_length(turnstile_expected_hostname) <= 253),

  promptpay_source text not null default 'environment'
    check (promptpay_source in ('environment', 'backend', 'disabled')),
  promptpay_id_ciphertext text,

  google_login_visible boolean not null default true,
  facebook_login_visible boolean not null default true,

  updated_at timestamptz not null default now(),
  updated_by uuid references public.users(id) on delete set null
);

alter table public.integration_settings enable row level security;

revoke all on table public.integration_settings from public, anon, authenticated, service_role;
grant select, insert, update on table public.integration_settings to service_role;

insert into public.integration_settings (id)
values (1)
on conflict (id) do nothing;

comment on table public.integration_settings is
  'Singleton runtime integration configuration. Secrets are AES-256-GCM ciphertext managed server-side.';
comment on column public.integration_settings.google_login_visible is
  'Controls the application login button only; Supabase Auth provider credentials remain deployment configuration.';
comment on column public.integration_settings.facebook_login_visible is
  'Controls the application login button only; Supabase Auth provider credentials remain deployment configuration.';
