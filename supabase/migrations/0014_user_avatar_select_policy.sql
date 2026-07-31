-- ============================================================
-- แก้บั๊ก: อัปโหลด avatar ด้วย upsert:true ล้มเหลว "row-level security policy"
-- เพราะ storage API เช็คว่าไฟล์มีอยู่แล้วหรือไม่ (SELECT) ก่อนจะเลือก insert/update ให้
-- 0013_user_avatars.sql มีแค่ insert/update/delete policy ไม่มี select — ขาดตรงนี้ไปจุดเดียว
-- ============================================================

create policy "own avatar select" on storage.objects for select
  using (bucket_id = 'user-avatars' and (storage.foldername(name))[1] = auth.uid()::text);
