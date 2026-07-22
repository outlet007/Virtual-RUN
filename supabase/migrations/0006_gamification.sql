-- ============================================================
-- Phase 5 — Gamification (เหรียญดิจิทัล + แต้ม/rewards)
-- ============================================================

-- rewards/redemptions ยังไม่เคย enable RLS เลยตั้งแต่ 0001_init.sql (ยังไม่มีโค้ดแตะ)
-- เปิดไว้เฉยๆ ไม่มี policy = เข้าถึงไม่ได้เลยผ่าน anon/authenticated จนกว่าจะเพิ่ม policy ด้านล่าง
alter table public.rewards      enable row level security;
alter table public.redemptions  enable row level security;

create policy "rewards public read" on public.rewards for select using (true);

create policy "own redemptions read" on public.redemptions
  for select using (auth.uid() = user_id);
create policy "own redemptions insert" on public.redemptions
  for insert with check (auth.uid() = user_id);
-- ไม่มี update/delete ให้ user เอง — admin เท่านั้นที่ fulfill ได้ ผ่าน service-role client

-- หมายเหตุ: points_ledger / user_medals ไม่เพิ่ม insert policy ให้ authenticated โดยตั้งใจ
-- เป็นข้อมูลที่ระบบคำนวณให้เท่านั้น (ดู lib/gamification.ts) เขียนผ่าน service-role client เสมอ
-- ถ้าเปิดให้ user insert เองได้ จะกด PATCH แจกแต้มให้ตัวเองได้ตรงๆ
