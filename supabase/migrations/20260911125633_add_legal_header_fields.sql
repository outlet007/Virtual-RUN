-- Store independent bilingual header titles and subtitles for each public legal page.
-- The existing public SELECT policy is intentional; browser roles receive no write policy.
alter table public.system_settings
  add column privacy_header_title text not null default 'นโยบายความเป็นส่วนตัว',
  add column privacy_header_title_en text not null default 'Privacy Notice',
  add column privacy_header_subtitle text not null default 'นโยบายนี้อธิบายว่าระบบ Virtual RUN เก็บ ใช้ เปิดเผย เก็บรักษา และคุ้มครองข้อมูลส่วนบุคคลของผู้ใช้อย่างไร',
  add column privacy_header_subtitle_en text not null default 'This notice explains how Virtual RUN collects, uses, discloses, retains, and protects users'' personal data.',
  add column terms_header_title text not null default 'ข้อกำหนดการใช้บริการ',
  add column terms_header_title_en text not null default 'Terms of Service',
  add column terms_header_subtitle text not null default 'ข้อกำหนดนี้ใช้กับการสมัครสมาชิก การเข้าร่วมกิจกรรม และการใช้บริการทั้งหมดของ Virtual RUN',
  add column terms_header_subtitle_en text not null default 'These terms apply to account registration, event participation, and all use of Virtual RUN.',
  add column data_deletion_header_title text not null default 'คำแนะนำการลบข้อมูลผู้ใช้',
  add column data_deletion_header_title_en text not null default 'User Data Deletion Instructions',
  add column data_deletion_header_subtitle text not null default 'ผู้ใช้สามารถขอลบบัญชี Virtual RUN และข้อมูลที่เชื่อมโยงกับ Facebook หรือผู้ให้บริการเข้าสู่ระบบอื่นได้ตามขั้นตอนต่อไปนี้',
  add column data_deletion_header_subtitle_en text not null default 'Users can request deletion of their Virtual RUN account and data linked to Facebook or another sign-in provider by following these steps.',
  add constraint system_settings_privacy_header_title_length_check
    check (char_length(privacy_header_title) between 1 and 240),
  add constraint system_settings_privacy_header_title_en_length_check
    check (char_length(privacy_header_title_en) between 1 and 240),
  add constraint system_settings_privacy_header_subtitle_length_check
    check (char_length(privacy_header_subtitle) between 1 and 500),
  add constraint system_settings_privacy_header_subtitle_en_length_check
    check (char_length(privacy_header_subtitle_en) between 1 and 500),
  add constraint system_settings_terms_header_title_length_check
    check (char_length(terms_header_title) between 1 and 240),
  add constraint system_settings_terms_header_title_en_length_check
    check (char_length(terms_header_title_en) between 1 and 240),
  add constraint system_settings_terms_header_subtitle_length_check
    check (char_length(terms_header_subtitle) between 1 and 500),
  add constraint system_settings_terms_header_subtitle_en_length_check
    check (char_length(terms_header_subtitle_en) between 1 and 500),
  add constraint system_settings_data_deletion_header_title_length_check
    check (char_length(data_deletion_header_title) between 1 and 240),
  add constraint system_settings_data_deletion_header_title_en_length_check
    check (char_length(data_deletion_header_title_en) between 1 and 240),
  add constraint system_settings_data_deletion_header_subtitle_length_check
    check (char_length(data_deletion_header_subtitle) between 1 and 500),
  add constraint system_settings_data_deletion_header_subtitle_en_length_check
    check (char_length(data_deletion_header_subtitle_en) between 1 and 500);
