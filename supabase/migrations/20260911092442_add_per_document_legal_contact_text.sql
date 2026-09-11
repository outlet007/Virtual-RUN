-- Restore the original contact copy as independent values for each legal page.
-- Existing public-read RLS remains unchanged; browser roles receive no write policy.
alter table public.system_settings
  add column privacy_contact_text text not null default $contact_th$
ติดต่อผู้ดูแล Virtual RUN ผ่านอีเมลติดต่ออย่างเป็นทางการที่ระบุในแอป Meta หรือช่องทางของมหาวิทยาลัยกรุงเทพ
$contact_th$,
  add column privacy_contact_text_en text not null default $contact_en$
Contact the Virtual RUN administrator using the official email listed in the Meta app or an official Bangkok University channel.
$contact_en$,
  add column terms_contact_text text not null default $contact_th$
ติดต่อผู้ดูแล Virtual RUN ผ่านอีเมลติดต่ออย่างเป็นทางการที่ระบุในแอป Meta หรือช่องทางของมหาวิทยาลัยกรุงเทพ
$contact_th$,
  add column terms_contact_text_en text not null default $contact_en$
Contact the Virtual RUN administrator using the official email listed in the Meta app or an official Bangkok University channel.
$contact_en$,
  add column data_deletion_contact_text text not null default $contact_th$
ติดต่อผู้ดูแล Virtual RUN ผ่านอีเมลติดต่ออย่างเป็นทางการที่ระบุในแอป Meta หรือช่องทางของมหาวิทยาลัยกรุงเทพ
$contact_th$,
  add column data_deletion_contact_text_en text not null default $contact_en$
Contact the Virtual RUN administrator using the official email listed in the Meta app or an official Bangkok University channel.
$contact_en$,
  add constraint system_settings_privacy_contact_text_length_check
    check (char_length(privacy_contact_text) between 1 and 2000),
  add constraint system_settings_privacy_contact_text_en_length_check
    check (char_length(privacy_contact_text_en) between 1 and 2000),
  add constraint system_settings_terms_contact_text_length_check
    check (char_length(terms_contact_text) between 1 and 2000),
  add constraint system_settings_terms_contact_text_en_length_check
    check (char_length(terms_contact_text_en) between 1 and 2000),
  add constraint system_settings_data_deletion_contact_text_length_check
    check (char_length(data_deletion_contact_text) between 1 and 2000),
  add constraint system_settings_data_deletion_contact_text_en_length_check
    check (char_length(data_deletion_contact_text_en) between 1 and 2000);
