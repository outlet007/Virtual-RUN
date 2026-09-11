-- Public legal copy is stored with the existing singleton system settings row.
-- The existing public SELECT policy is intentional: these fields are rendered
-- on public pages. Updates still have no browser policy and remain service-role only.

alter table public.system_settings
  add column terms_of_service_text text not null default $terms_th$
1. การยอมรับข้อกำหนด
เมื่อสร้างบัญชี สมัครกิจกรรม หรือใช้ Virtual RUN ถือว่าผู้ใช้ยอมรับข้อกำหนดฉบับนี้และนโยบายความเป็นส่วนตัว

2. บัญชีผู้ใช้
ผู้ใช้ต้องให้ข้อมูลที่ถูกต้อง รักษาความปลอดภัยของช่องทางเข้าสู่ระบบ และรับผิดชอบกิจกรรมที่เกิดขึ้นภายใต้บัญชีของตน

3. การใช้บริการ
ห้ามส่งผลวิ่งหรือหลักฐานที่เป็นเท็จ ใช้งานระบบโดยมิชอบ รบกวนความปลอดภัย หรือใช้บริการในลักษณะที่ละเมิดกฎหมายหรือสิทธิของบุคคลอื่น

4. ผลกิจกรรม คะแนน และรางวัล
ผู้ดูแลอาจตรวจสอบ แก้ไข ปฏิเสธ หรือยกเลิกผล คะแนน เหรียญ และรางวัลเมื่อข้อมูลไม่ครบ ไม่ถูกต้อง ซ้ำ หรือขัดต่อกติกากิจกรรม

5. การเปลี่ยนแปลงและการติดต่อ
กติกากิจกรรม คุณสมบัติ และข้อกำหนดอาจปรับปรุงได้ตามความเหมาะสม หากมีคำถามโปรดติดต่อผู้ดูแล Virtual RUN ผ่านช่องทางอย่างเป็นทางการ
$terms_th$,
  add column terms_of_service_text_en text not null default $terms_en$
1. Acceptance of Terms
By creating an account, joining an event, or using Virtual RUN, users accept these Terms and the Privacy Notice.

2. User Accounts
Users must provide accurate information, protect their sign-in methods, and remain responsible for activity performed through their accounts.

3. Acceptable Use
Users must not submit false results or evidence, misuse the system, interfere with security, or use the service in a way that violates law or another person's rights.

4. Results, Points, and Rewards
Administrators may review, correct, reject, or cancel results, points, medals, and rewards when information is incomplete, inaccurate, duplicated, or contrary to event rules.

5. Changes and Contact
Event rules, features, and these Terms may be updated when appropriate. Questions may be directed to the Virtual RUN administrator through an official contact channel.
$terms_en$,
  add column data_deletion_text text not null default $deletion_th$
1. ถอนการเชื่อมต่อจาก Facebook
เปิด Facebook แล้วไปที่ การตั้งค่าและความเป็นส่วนตัว > การตั้งค่า > แอพและเว็บไซต์ เลือก BU Virtual RUN แล้วกดนำออก การดำเนินการนี้หยุดการเข้าถึงข้อมูลใหม่ แต่ไม่ลบข้อมูลที่บันทึกไว้ใน Virtual RUN โดยอัตโนมัติ

2. ส่งคำขอลบบัญชีและข้อมูล
ติดต่อผู้ดูแล Virtual RUN ผ่านอีเมลหรือช่องทางอย่างเป็นทางการ ระบุหัวข้อ "ขอลบบัญชี Virtual RUN" พร้อมชื่อ อีเมลที่ใช้สมัคร และวิธีเข้าสู่ระบบ ห้ามส่งรหัสผ่าน App Secret หรือ access token

3. การยืนยันตัวตนและดำเนินการ
ผู้ดูแลอาจขอข้อมูลเพิ่มเติมเท่าที่จำเป็นเพื่อยืนยันว่าเป็นเจ้าของบัญชี หลังยืนยันแล้วจะลบหรือทำให้ข้อมูลบัญชีและข้อมูลที่เชื่อมโยงไม่สามารถระบุตัวบุคคลได้โดยไม่ชักช้า

4. ข้อมูลที่อาจต้องเก็บไว้
ข้อมูลบางรายการอาจถูกเก็บไว้ชั่วคราวเมื่อกฎหมายกำหนด หรือจำเป็นต่อการชำระเงิน การบัญชี การป้องกันการทุจริต ความปลอดภัย หรือข้อพิพาท และจะถูกลบหรือทำให้ไม่สามารถระบุตัวบุคคลได้เมื่อหมดความจำเป็น
$deletion_th$,
  add column data_deletion_text_en text not null default $deletion_en$
1. Remove Facebook Access
Open Facebook and go to Settings & privacy > Settings > Apps and websites. Select BU Virtual RUN and choose Remove. This stops future access to new Facebook data but does not automatically delete data already stored by Virtual RUN.

2. Request Account and Data Deletion
Contact the Virtual RUN administrator through an official email or contact channel. Use the subject "Virtual RUN account deletion request" and provide your name, registered email address, and sign-in method. Never send a password, App Secret, or access token.

3. Verification and Processing
The administrator may request only the additional information needed to verify account ownership. After verification, account data and linked information will be deleted or de-identified without undue delay.

4. Data That May Be Retained
Some records may be retained temporarily where required by law or needed for payments, accounting, fraud prevention, security, or disputes. They will be deleted or de-identified when retention is no longer necessary.
$deletion_en$,
  add constraint system_settings_terms_of_service_text_length_check
    check (char_length(terms_of_service_text) between 1 and 20000),
  add constraint system_settings_terms_of_service_text_en_length_check
    check (char_length(terms_of_service_text_en) between 1 and 20000),
  add constraint system_settings_data_deletion_text_length_check
    check (char_length(data_deletion_text) between 1 and 20000),
  add constraint system_settings_data_deletion_text_en_length_check
    check (char_length(data_deletion_text_en) between 1 and 20000);
