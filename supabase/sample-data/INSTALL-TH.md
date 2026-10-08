# ติดตั้ง Sample Data สำหรับ Virtual RUN version 3.8

ชุดนี้เป็นข้อมูลสังเคราะห์สำหรับตรวจหน้าเว็บและขั้นตอนผู้ดูแลระบบ โดยไม่คัดลอกข้อมูลผู้ใช้จริง

## ข้อมูลที่ติดตั้ง

- งานวิ่ง 3 งาน: กำลังเปิดรับสมัคร 2 งาน และงานย้อนหลัง 1 งาน
- แพ็กเกจ 5 แพ็กเกจ
- เหรียญดิจิทัล 5 รายการ และเหรียญจริง 3 รายการ
- รางวัล 3 รายการ
- Hero banner 3 รายการ
- หมวดหมู่บทความ 3 หมวด และบทความสองภาษา 4 บทความ

รูปภาพอ้างอิงไฟล์ใน `public/mock-events` จึงไม่ต้อง restore Supabase Storage เพิ่มเติม ชุดนี้ไม่มี `auth.users`, password hash, consent, token, ข้อมูลส่วนบุคคล หรือหลักฐานการวิ่ง หลังติดตั้งให้สร้างผู้ใช้ผ่านหน้าสมัครสมาชิกตามปกติ

## ติดตั้งบน Supabase Self Hosted

รันจาก repository ของ Virtual RUN โดยส่งตำแหน่ง Supabase project ให้สคริปต์:

```bash
chmod +x scripts/install-sample-data.sh
./scripts/install-sample-data.sh /webserver/supabase-project
```

สคริปต์จะไม่ติดตั้ง Supabase ใหม่ ไม่ลบข้อมูลเดิม และไม่ restart Database/Auth/REST โดยจะส่ง `virtual-run-v3.8.sql` เข้า `psql` ภายใน service `db` และตรวจจำนวนข้อมูลหลังติดตั้ง

## ติดตั้งด้วยคำสั่งโดยตรง

บน Linux/macOS ที่ใช้ Supabase local:

```bash
docker exec -i supabase_db_virtual-run \
  psql -X --set=ON_ERROR_STOP=1 --username=postgres --dbname=postgres \
  < supabase/sample-data/virtual-run-v3.8.sql
```

## การรันซ้ำ

ทุกรายการใช้ UUID คงที่และ `ON CONFLICT ... DO UPDATE` จึงรันซ้ำได้โดยไม่เพิ่มรายการซ้ำ ข้อมูลอื่นที่ผู้ดูแลสร้างเองจะไม่ถูกลบหรือแก้ไข
