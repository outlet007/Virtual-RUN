-- Store the restored short contact sentences without surrounding newlines.
alter table public.system_settings
  alter column privacy_contact_text set default 'คุณสามารถติดต่อผู้ดูแลระบบเพื่อขอเข้าถึง แก้ไข หรือลบข้อมูลส่วนบุคคลของคุณได้',
  alter column privacy_contact_text_en set default 'You may contact the administrator to request access to, correction of, or deletion of your personal information.',
  alter column terms_contact_text set default 'หากมีคำถามเกี่ยวกับข้อกำหนดนี้ โปรดติดต่อผู้ดูแล Virtual RUN',
  alter column terms_contact_text_en set default 'For questions about these terms, please contact the Virtual RUN administrator.',
  alter column data_deletion_contact_text set default 'ติดต่อผู้ดูแล Virtual RUN โดยใช้หัวข้อ “คำขอลบข้อมูล Virtual RUN”',
  alter column data_deletion_contact_text_en set default 'Contact the Virtual RUN administrator with the subject “Virtual RUN Data Deletion Request.”';

update public.system_settings
set
  privacy_contact_text = 'คุณสามารถติดต่อผู้ดูแลระบบเพื่อขอเข้าถึง แก้ไข หรือลบข้อมูลส่วนบุคคลของคุณได้',
  privacy_contact_text_en = 'You may contact the administrator to request access to, correction of, or deletion of your personal information.',
  terms_contact_text = 'หากมีคำถามเกี่ยวกับข้อกำหนดนี้ โปรดติดต่อผู้ดูแล Virtual RUN',
  terms_contact_text_en = 'For questions about these terms, please contact the Virtual RUN administrator.',
  data_deletion_contact_text = 'ติดต่อผู้ดูแล Virtual RUN โดยใช้หัวข้อ “คำขอลบข้อมูล Virtual RUN”',
  data_deletion_contact_text_en = 'Contact the Virtual RUN administrator with the subject “Virtual RUN Data Deletion Request.”',
  updated_at = now()
where id = 1;
