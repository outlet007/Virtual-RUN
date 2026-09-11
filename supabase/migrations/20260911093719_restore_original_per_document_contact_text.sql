-- Restore the page-specific contact sentences that existed before the
-- backend contact editor was introduced. Keep each page independently editable.
alter table public.system_settings
  alter column privacy_contact_text set default $privacy_th$
คุณสามารถติดต่อผู้ดูแลระบบเพื่อขอเข้าถึง แก้ไข หรือลบข้อมูลส่วนบุคคลของคุณได้
$privacy_th$,
  alter column privacy_contact_text_en set default $privacy_en$
You may contact the administrator to request access to, correction of, or deletion of your personal information.
$privacy_en$,
  alter column terms_contact_text set default $terms_th$
หากมีคำถามเกี่ยวกับข้อกำหนดนี้ โปรดติดต่อผู้ดูแล Virtual RUN
$terms_th$,
  alter column terms_contact_text_en set default $terms_en$
For questions about these terms, please contact the Virtual RUN administrator.
$terms_en$,
  alter column data_deletion_contact_text set default $deletion_th$
ติดต่อผู้ดูแล Virtual RUN โดยใช้หัวข้อ “คำขอลบข้อมูล Virtual RUN”
$deletion_th$,
  alter column data_deletion_contact_text_en set default $deletion_en$
Contact the Virtual RUN administrator with the subject “Virtual RUN Data Deletion Request.”
$deletion_en$;

update public.system_settings
set
  privacy_contact_text = $privacy_th$
คุณสามารถติดต่อผู้ดูแลระบบเพื่อขอเข้าถึง แก้ไข หรือลบข้อมูลส่วนบุคคลของคุณได้
$privacy_th$,
  privacy_contact_text_en = $privacy_en$
You may contact the administrator to request access to, correction of, or deletion of your personal information.
$privacy_en$,
  terms_contact_text = $terms_th$
หากมีคำถามเกี่ยวกับข้อกำหนดนี้ โปรดติดต่อผู้ดูแล Virtual RUN
$terms_th$,
  terms_contact_text_en = $terms_en$
For questions about these terms, please contact the Virtual RUN administrator.
$terms_en$,
  data_deletion_contact_text = $deletion_th$
ติดต่อผู้ดูแล Virtual RUN โดยใช้หัวข้อ “คำขอลบข้อมูล Virtual RUN”
$deletion_th$,
  data_deletion_contact_text_en = $deletion_en$
Contact the Virtual RUN administrator with the subject “Virtual RUN Data Deletion Request.”
$deletion_en$,
  updated_at = now()
where id = 1;
