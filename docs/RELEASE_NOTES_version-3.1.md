# Virtual-RUN — สรุปปิดงาน 2026-08-13 version-3.1

## Release Metadata

- Branch: `version-3.1`
- Commit message: `Release version 3.1 - Secure transactional workflows and regression hardening`
- Base release: `version-2.12`
- Date: 2026-08-13 (Asia/Bangkok)

## งานทั้งหมดที่เสร็จในรอบวันนี้

### Admin และประสบการณ์ใช้งาน

- เปลี่ยนชื่อเมนู Admin จากผู้สมัครเป็นสมาชิก และเปลี่ยนหน้าจัดการเป็นจัดการสมาชิก
- ตรวจระบบผ่าน production Docker บน port 3000 โดยไม่ต้องใช้ `npm run dev`
- ทดสอบ authenticated evidence upload ผ่าน Chrome สำเร็จ

### Submission และ Gamification

- ตรวจ activity date แบบ YYYY-MM-DD และปฏิเสธวันที่ผิดรูปแบบหรือไม่มีจริง
- ทำ point synchronization ของ submission แบบ transaction และ idempotent
- การ approve/revoke ซ้ำให้ผลแต้มถูกต้องโดยไม่บวกหรือลบซ้ำ
- ป้องกัน medal bonus และ medal notification ซ้ำเมื่อเกิด insert conflict
- OCR หลักฐานวิ่งทดสอบได้ 1.00 km ที่ confidence 90.76% และระบบเพิ่มระยะ/แต้มถูกต้อง

### Payment, Reward และ Notification

- ทำ payment confirm/reject แบบ atomic ระหว่าง payment กับ registration
- ตรวจว่า payment ผูกกับ registration ที่ถูกต้อง และกดคำสั่งเดิมซ้ำได้อย่างปลอดภัย
- บังคับหนึ่ง payment ต่อหนึ่ง registration
- เพิ่ม notification dedupe key ต่อ user/channel/type/action
- ป้องกัน email/LINE ซ้ำสำหรับ registration, submission, payment, shipment, medal และ reward fulfillment
- Reward redemption รักษา stock และแต้มแบบ atomic; ของชิ้นสุดท้ายแลกซ้ำไม่ได้
- Reward fulfillment เปลี่ยนเฉพาะสถานะ pending และไม่แจ้งเตือนซ้ำ

### Event Registration Security

- รวมการสร้าง registration และ payment ไว้ใน authenticated RPC และ transaction เดียว
- งานฟรียืนยันใบสมัครและออก BIB โดยไม่สร้าง payment
- งานเสียเงินสร้าง registration pending และ payment pending พร้อมกัน
- หาก payment insert ล้มเหลว registration ถูก rollback ไม่เหลือข้อมูลค้าง
- ราคา สถานะงาน สถานะใบสมัคร และผู้ใช้มาจาก trusted database state
- ตรวจที่อยู่จัดส่งครบถ้วนสำหรับแพ็กเกจเหรียญกายภาพ
- ถอน direct INSERT/UPDATE ที่ client เคยใช้ข้ามขั้น payment ได้
- จำกัด RPC ด้วย `auth.uid()`, `search_path = ''` และสิทธิ์ execute เฉพาะ role ที่จำเป็น

## Verification ล่าสุด

- TypeScript ผ่าน
- Unit tests ผ่าน 69/69 ใน 18 test files
- Supabase Local migration history ตรงกัน 48 รายการ
- Supabase DB lint ไม่พบ schema error
- DB advisors ไม่พบ error
- SQL regression แบบ transaction/rollback ผ่านทั้ง submission points, payment review, reward redemption, notification dedupe และ registration/payment rollback
- Production Docker build ผ่าน
- Container `Virtual-RUN` ทำงานบน port 3000
- `http://localhost:3000` ตอบ HTTP 200 และ startup logs ปกติ
- ข้อมูล QA, Storage object และ database objects ชั่วคราวถูกลบหรือ rollback แล้ว
- ไม่สร้างหรือเปิดบริการเสียเงิน

## External State

- Migration ช่วง Stage 2.6–2.12 ยังไม่ได้ใช้กับ Supabase ภายนอก
- การทดสอบทั้งหมดรอบนี้ใช้ local Supabase และ local production Docker

## งานที่ทำต่อครั้งหน้า

1. แก้ RLS performance advisor warnings 19 รายการด้วย `(select auth.uid())`
2. ตรวจ indexes ของ foreign keys, RLS columns และ high-traffic queries
3. ตรวจ server-only credential boundaries และตัวแปร `NEXT_PUBLIC_*`
4. สร้าง Supabase Free staging เฉพาะเมื่อจำเป็นต้องทดสอบออนไลน์หรือหลายอุปกรณ์
5. ทดสอบ Strava จริงเมื่อพร้อมเปิด public callback

## สถานะปิดงาน

พร้อมหยุดงานวันนี้ ระบบ local production ยังเปิดใช้งานที่ `http://localhost:3000` และสามารถเริ่มรอบถัดไปจากหัวข้อ “งานที่ทำต่อครั้งหน้า” ได้ทันที