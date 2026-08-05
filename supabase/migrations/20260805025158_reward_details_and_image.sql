alter table public.rewards
  add column if not exists description text,
  add column if not exists image_url text;
