alter table public.system_settings
  add column cookie_consent_enabled boolean not null default true,
  add column cookie_consent_message text not null
    default 'เราใช้ cookies บนเว็บไซต์นี้เพื่อการบริหารเว็บไซต์ และเพิ่มประสิทธิภาพการใช้งานของท่าน สามารถตรวจสอบหรือดูนโยบายของ cookies ได้',
  add column cookie_policy_url text not null default '',
  add column cookie_consent_button_label text not null default 'ยอมรับ';

alter table public.system_settings
  add constraint system_settings_cookie_message_length
    check (char_length(cookie_consent_message) between 1 and 1000),
  add constraint system_settings_cookie_policy_url_length
    check (char_length(cookie_policy_url) <= 2048),
  add constraint system_settings_cookie_button_label_length
    check (char_length(cookie_consent_button_label) between 1 and 50);
