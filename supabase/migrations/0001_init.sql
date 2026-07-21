-- ============================================================
-- Virtual Run Platform — Initial Schema (Phase 0)
-- ครอบคลุมตารางทั้งหมดจาก ER diagram (ใช้จริงบางส่วนใน Phase 0-1)
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- USERS (profile ผูกกับ auth.users) ----------
create table public.users (
  id           uuid primary key references auth.users(id) on delete cascade,
  name         text,
  email        text,
  phone        text,
  line_user_id text,
  created_at   timestamptz not null default now()
);

-- auto-create profile row เมื่อมี auth user ใหม่
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- EVENTS ----------
create table public.events (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  cover_image text,
  pricing     text not null default 'free' check (pricing in ('free','paid')),
  start_date  date not null,
  end_date    date not null,
  status      text not null default 'draft' check (status in ('draft','open','closed')),
  created_at  timestamptz not null default now()
);

-- ---------- PACKAGES ----------
create table public.packages (
  id                 uuid primary key default gen_random_uuid(),
  event_id           uuid not null references public.events(id) on delete cascade,
  name               text not null,
  target_distance_km integer not null,
  price              numeric(10,2) not null default 0,
  activity_types     text[] not null default '{run,walk}',
  has_physical_medal boolean not null default false,
  created_at         timestamptz not null default now()
);

-- ---------- REGISTRATIONS ----------
create table public.registrations (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.users(id) on delete cascade,
  package_id       uuid not null references public.packages(id),
  event_id         uuid not null references public.events(id),
  bib_number       text,
  shipping_address jsonb,
  status           text not null default 'pending' check (status in ('pending','confirmed','cancelled')),
  registered_at    timestamptz not null default now(),
  unique (user_id, package_id)
);

-- ---------- PAYMENTS ----------
create table public.payments (
  id              uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.registrations(id) on delete cascade,
  amount          numeric(10,2) not null,
  method          text not null default 'promptpay',
  charge_ref      text,
  status          text not null default 'pending' check (status in ('pending','paid','failed')),
  paid_at         timestamptz
);

-- ---------- SUBMISSIONS (ผลวิ่ง) ----------
create table public.submissions (
  id                uuid primary key default gen_random_uuid(),
  registration_id   uuid not null references public.registrations(id) on delete cascade,
  user_id           uuid not null references public.users(id) on delete cascade,
  source            text not null default 'upload' check (source in ('strava','upload')),
  activity_type     text not null default 'run' check (activity_type in ('run','walk')),
  distance_km       numeric(6,2) not null,
  duration_sec      integer,
  activity_date     timestamptz not null,
  strava_activity_id text,
  evidence_url      text,
  status            text not null default 'pending' check (status in ('approved','pending','flagged','rejected')),
  created_at        timestamptz not null default now()
);

-- ---------- SHIPMENTS (เหรียญกายภาพ) ----------
create table public.shipments (
  id              uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.registrations(id) on delete cascade,
  tracking_no     text,
  carrier         text,
  status          text not null default 'pending' check (status in ('pending','packed','shipped','delivered')),
  shipped_at      timestamptz
);

-- ---------- MEDALS (เหรียญดิจิทัล) ----------
create table public.medals (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references public.events(id) on delete cascade,
  name         text not null,
  image_url    text,
  tier         text not null default 'bronze' check (tier in ('bronze','silver','gold','legendary')),
  unlock_rule  jsonb not null,
  bonus_points integer not null default 0
);

create table public.user_medals (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  medal_id    uuid not null references public.medals(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  unique (user_id, medal_id)
);

-- ---------- POINTS ----------
create table public.points_ledger (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  delta      integer not null,
  reason     text,
  ref_type   text,
  ref_id     uuid,
  created_at timestamptz not null default now()
);

create table public.rewards (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  cost_points integer not null,
  stock       integer not null default 0
);

create table public.redemptions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users(id) on delete cascade,
  reward_id    uuid not null references public.rewards(id),
  points_spent integer not null,
  status       text not null default 'pending' check (status in ('pending','fulfilled'))
);

-- ---------- CONSENTS (PDPA) ----------
create table public.consents (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.users(id) on delete cascade,
  policy_version text not null,
  type           text not null default 'privacy' check (type in ('privacy','terms','marketing')),
  consented_at   timestamptz not null default now(),
  ip_address     text
);

-- ---------- NOTIFICATIONS ----------
create table public.notifications (
  id      uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  channel text not null default 'email' check (channel in ('email','line')),
  type    text not null,
  status  text not null default 'queued' check (status in ('queued','sent','failed')),
  sent_at timestamptz
);

-- ---------- STRAVA (Phase 3) ----------
create table public.strava_connections (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.users(id) on delete cascade,
  strava_athlete_id text,
  access_token      text,
  refresh_token     text,
  token_expires_at  timestamptz,
  unique (user_id)
);

-- indexes ที่ใช้บ่อย
create index on public.packages (event_id);
create index on public.registrations (user_id);
create index on public.submissions (registration_id);
create index on public.submissions (user_id, status);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.users            enable row level security;
alter table public.events           enable row level security;
alter table public.packages         enable row level security;
alter table public.registrations    enable row level security;
alter table public.payments         enable row level security;
alter table public.submissions      enable row level security;
alter table public.shipments        enable row level security;
alter table public.medals           enable row level security;
alter table public.user_medals      enable row level security;
alter table public.points_ledger    enable row level security;
alter table public.consents         enable row level security;
alter table public.notifications    enable row level security;
alter table public.strava_connections enable row level security;

-- events / packages / medals: อ่านได้สาธารณะ (เฉพาะที่เผยแพร่)
create policy "events public read" on public.events
  for select using (status in ('open','closed'));
create policy "packages public read" on public.packages
  for select using (true);
create policy "medals public read" on public.medals
  for select using (true);

-- users: อ่าน/แก้ไขของตัวเอง
create policy "own profile read"   on public.users for select using (auth.uid() = id);
create policy "own profile update" on public.users for update using (auth.uid() = id);

-- registrations: จัดการของตัวเอง
create policy "own regs read"   on public.registrations for select using (auth.uid() = user_id);
create policy "own regs insert" on public.registrations for insert with check (auth.uid() = user_id);
create policy "own regs update" on public.registrations for update using (auth.uid() = user_id);

-- submissions: จัดการของตัวเอง
create policy "own subs read"   on public.submissions for select using (auth.uid() = user_id);
create policy "own subs insert" on public.submissions for insert with check (auth.uid() = user_id);

-- consents / points / user_medals / notifications: อ่านของตัวเอง (+insert consent)
create policy "own consents read"   on public.consents for select using (auth.uid() = user_id);
create policy "own consents insert" on public.consents for insert with check (auth.uid() = user_id);
create policy "own points read"     on public.points_ledger for select using (auth.uid() = user_id);
create policy "own medals read"     on public.user_medals for select using (auth.uid() = user_id);
create policy "own notifs read"     on public.notifications for select using (auth.uid() = user_id);
create policy "own strava read"     on public.strava_connections for select using (auth.uid() = user_id);
create policy "own shipments read"  on public.shipments for select using (
  exists (select 1 from public.registrations r where r.id = registration_id and r.user_id = auth.uid())
);
create policy "own payments read"   on public.payments for select using (
  exists (select 1 from public.registrations r where r.id = registration_id and r.user_id = auth.uid())
);

-- หมายเหตุ: การเขียนฝั่ง admin (สร้าง event, อนุมัติ submission, ฯลฯ)
-- ควรทำผ่าน service role key ในฝั่ง server เท่านั้น (ข้าม RLS) — จะเพิ่มใน Phase 2
