-- SMTP settings managed from the server-rendered super-admin backend.
-- Credentials are encrypted by the application before they reach this table.
-- Browser roles receive no grants and no RLS policies.

create table public.smtp_settings (
  id smallint primary key default 1 check (id = 1),
  enabled boolean not null default false,
  host text not null default '' check (char_length(host) <= 255),
  port integer not null default 587 check (port between 1 and 65535),
  secure boolean not null default false,
  username text not null default '' check (char_length(username) <= 320),
  password_ciphertext text,
  from_name text not null default 'Virtual RUN' check (char_length(from_name) <= 255),
  from_email text not null default '' check (char_length(from_email) <= 254),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.users(id) on delete set null
);

alter table public.smtp_settings enable row level security;

revoke all on table public.smtp_settings from public, anon, authenticated, service_role;
grant select, insert, update on table public.smtp_settings to service_role;

insert into public.smtp_settings (id)
values (1)
on conflict (id) do nothing;

comment on table public.smtp_settings is
  'Singleton SMTP configuration. Password is AES-256-GCM ciphertext managed server-side.';
comment on column public.smtp_settings.password_ciphertext is
  'Encrypted SMTP password; never return this value to a browser client.';
