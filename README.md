# Virtual Run Platform — Phase 0-1

ระบบวิ่งเสมือน (virtual run) เก็บระยะ สะสมเหรียญ — scaffold ฝั่งผู้เข้าร่วม (participant)

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind · Supabase (Postgres + Auth + RLS)

## สิ่งที่มีใน Phase 0-1
- Schema เต็มบน Supabase (ทุกตารางจาก ER diagram) + RLS
- สมัคร/เข้าสู่ระบบ พร้อม **consent PDPA**
- รายการงาน + รายละเอียด + เลือกแพ็กเกจ
- สมัครงานฟรี → ออกเลข BIB (งานเสียเงินบันทึกเป็น "รอชำระ" ไว้ต่อ Phase 4)
- กรอก **ที่อยู่จัดส่ง** อัตโนมัติเมื่อแพ็กเกจมีเหรียญกายภาพ
- **บันทึกผลวิ่งเอง** + rule check เบื้องต้น (ตรวจ pace)
- **แดชบอร์ด**: ระยะสะสมรวม, ความคืบหน้าเทียบเป้า (แถบลู่วิ่ง), ประวัติผลวิ่ง

## เริ่มใช้งาน

### 1. สร้าง Supabase project
- ไปที่ https://supabase.com → New Project
- คัดลอก **Project URL** และ **anon key** จาก Settings > API

### 2. รัน migration + seed
เปิด Supabase **SQL Editor** แล้วรันไฟล์ตามลำดับ:
1. `supabase/migrations/0001_init.sql`
2. `supabase/seed.sql` (ข้อมูลงานตัวอย่าง)

### 3. ตั้งค่า env
```bash
cp .env.example .env.local
# แล้วใส่ค่า NEXT_PUBLIC_SUPABASE_URL และ NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### 4. ปิด email confirmation (สำหรับ dev)
Supabase > Authentication > Providers > Email → ปิด "Confirm email"
(เพื่อให้สมัครแล้วมี session ทันที + บันทึก consent ได้)

### 5. รัน

**แบบตรง (host):**
```bash
npm install
npm run dev
```

**แบบ Docker (dev, hot-reload):** ต้องมี local Supabase รันอยู่ก่อน (`supabase start`)
```bash
docker compose -f docker-compose.dev.yml up
```
mount โค้ดเป็น volume แล้วรัน `next dev` ในคอนเทนเนอร์ — แก้โค้ดแล้ว hot-reload ทันทีเหมือนรันตรง ไม่ต้อง build ใหม่ทุกครั้ง (ฝั่ง container เรียก Supabase ผ่าน `host.docker.internal` แทน `127.0.0.1` โดยอัตโนมัติผ่าน `SUPABASE_URL` ใน `docker-compose.dev.yml`)

**แบบ Docker (production build — วิธีหลักสำหรับเปิดดูระบบ):**
```bash
docker compose up -d --build
```
คำสั่งนี้ build image ล่าสุดและรัน container แบบ background เปิดระบบที่
http://localhost:3000 โดยไม่ต้องรัน `npm run dev` เพิ่ม

หลังแก้ไขหรือเขียนโค้ดเสร็จทุกครั้ง ให้รันคำสั่งนี้และตรวจว่า container
มีสถานะ running พร้อมเปิดหน้าเว็บได้จริงก่อนถือว่างานเสร็จ

เปิด http://localhost:3000

## ถัดไป (ตาม roadmap)
- Phase 2: หน้า admin (สร้างงาน, ตรวจ submission, จัดส่งเหรียญ)
- Phase 3: เชื่อม Strava (OAuth + webhook + rule engine เต็ม)
- Phase 4: ชำระเงิน PromptPay
- Phase 5: เหรียญ + แต้ม + รางวัล
- Phase 6: แจ้งเตือน อีเมล + LINE Messaging API

## หมายเหตุ
- การเขียนฝั่ง admin ควรใช้ Supabase **service role key** ฝั่ง server เท่านั้น (ข้าม RLS)
- อย่า commit `.env.local`
