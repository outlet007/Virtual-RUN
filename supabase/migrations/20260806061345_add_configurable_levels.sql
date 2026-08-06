create table public.levels (
  id uuid primary key default gen_random_uuid(),
  level_number smallint not null unique,
  name text not null,
  min_xp integer not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint levels_level_number_range check (level_number between 1 and 999),
  constraint levels_name_length check (char_length(btrim(name)) between 1 and 50),
  constraint levels_min_xp_range check (min_xp between 0 and 1000000000)
);

insert into public.levels (level_number, name, min_xp)
values
  (1, 'ผู้เริ่มต้น', 0),
  (2, 'นักวิ่งฝึกหัด', 1000),
  (3, 'นักวิ่งมุ่งมั่น', 2000),
  (4, 'นักวิ่งแข็งแกร่ง', 3000),
  (5, 'นักวิ่งชำนาญ', 4000),
  (6, 'นักวิ่งยอดเยี่ยม', 5000),
  (7, 'นักวิ่งระดับสูง', 6000),
  (8, 'นักวิ่งมืออาชีพ', 7000),
  (9, 'นักวิ่งระดับแชมป์', 8000),
  (10, 'ตำนานนักวิ่ง', 9000);

alter table public.levels enable row level security;

revoke all on table public.levels from public, anon, authenticated;
grant select on table public.levels to authenticated;
grant all on table public.levels to service_role;

create policy "authenticated users read levels"
on public.levels
for select
to authenticated
using (true);
