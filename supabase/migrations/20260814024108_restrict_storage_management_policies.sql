-- These policies already perform an admin-role lookup. Restrict their target
-- role as well so anonymous requests never evaluate management policies.
alter policy "admin manage event images" on storage.objects
  to authenticated;

alter policy "admin manage event videos" on storage.objects
  to authenticated;

alter policy "admin manage system assets" on storage.objects
  to authenticated;

alter policy "managers manage content assets" on storage.objects
  to authenticated;
