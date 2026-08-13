-- Fill English copies for the default editorial content created by migrations.
-- User-managed content remains untouched so an empty English field can still
-- intentionally fall back to Thai.

update public.levels
set name_en = case level_number
  when 1 then 'Beginner'
  when 2 then 'Novice Runner'
  when 3 then 'Committed Runner'
  when 4 then 'Strong Runner'
  when 5 then 'Skilled Runner'
  when 6 then 'Outstanding Runner'
  when 7 then 'Advanced Runner'
  when 8 then 'Professional Runner'
  when 9 then 'Champion Runner'
  when 10 then 'Running Legend'
end
where level_number between 1 and 10
  and nullif(btrim(name_en), '') is null;

update public.system_settings
set
  cookie_consent_message_en = coalesce(
    nullif(btrim(cookie_consent_message_en), ''),
    'We use cookies to operate this website and improve your experience. You can review our cookie policy for more information.'
  ),
  cookie_consent_button_label_en = coalesce(
    nullif(btrim(cookie_consent_button_label_en), ''),
    'Accept'
  )
where id = 1;