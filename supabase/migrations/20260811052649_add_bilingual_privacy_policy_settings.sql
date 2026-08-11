alter table public.system_settings
  add column privacy_policy_text text not null default $privacy_th$
เราให้ความสำคัญกับความเป็นส่วนตัวของคุณ ข้อมูลที่ให้ไว้ระหว่างการสมัครสมาชิกจะถูกใช้เพื่อสร้างและดูแลบัญชี บันทึกการเข้าร่วมกิจกรรม ประมวลผลผลวิ่ง และให้บริการที่เกี่ยวข้อง

เราจะจัดเก็บข้อมูลเท่าที่จำเป็น ใช้มาตรการรักษาความปลอดภัยที่เหมาะสม และไม่เปิดเผยข้อมูลแก่บุคคลภายนอก เว้นแต่จำเป็นต่อการให้บริการ ตามกฎหมาย หรือได้รับความยินยอมจากคุณ

คุณสามารถติดต่อผู้ดูแลระบบเพื่อขอเข้าถึง แก้ไข หรือลบข้อมูลส่วนบุคคลของคุณได้
$privacy_th$,
  add column privacy_policy_text_en text not null default $privacy_en$
We value your privacy. Information provided during registration is used to create and maintain your account, record event participation, process activity results, and provide related services.

We retain only the information necessary for these purposes, apply appropriate security measures, and do not disclose it to third parties unless required to provide the service, comply with the law, or with your consent.

You may contact the administrator to request access to, correction of, or deletion of your personal information.
$privacy_en$,
  add constraint system_settings_privacy_policy_text_length_check
    check (char_length(privacy_policy_text) between 1 and 20000),
  add constraint system_settings_privacy_policy_text_en_length_check
    check (char_length(privacy_policy_text_en) between 1 and 20000);
