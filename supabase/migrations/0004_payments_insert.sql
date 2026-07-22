-- ============================================================
-- Phase 4 — Payment
-- ============================================================

-- payments มีแค่ policy select ของตัวเองมาตั้งแต่ 0001_init.sql (ยังไม่เคยใช้จริง)
-- registerForEvent (session client) ต้อง insert payment ของ registration ตัวเองได้
create policy "own payments insert" on public.payments
  for insert with check (
    exists (select 1 from public.registrations r where r.id = registration_id and r.user_id = auth.uid())
  );
