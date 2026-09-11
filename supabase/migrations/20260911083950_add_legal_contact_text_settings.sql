-- Editable bilingual contact copy shared by the public legal pages.
-- The existing singleton table remains public-read and service-role-write only.
alter table public.system_settings
  add column legal_contact_text text not null default $contact_th$
ติดต่อผู้ดูแล Virtual RUN ผ่านอีเมลติดต่ออย่างเป็นทางการที่ระบุในแอป Meta หรือช่องทางของมหาวิทยาลัยกรุงเทพ
$contact_th$,
  add column legal_contact_text_en text not null default $contact_en$
Contact the Virtual RUN administrator using the official email listed in the Meta app or an official Bangkok University channel.
$contact_en$,
  add constraint system_settings_legal_contact_text_length_check
    check (char_length(legal_contact_text) between 1 and 2000),
  add constraint system_settings_legal_contact_text_en_length_check
    check (char_length(legal_contact_text_en) between 1 and 2000);
