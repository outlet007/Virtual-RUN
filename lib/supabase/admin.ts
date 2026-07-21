import { createClient } from "@supabase/supabase-js";

// Service role client — ข้าม RLS ทั้งหมด ใช้เฉพาะฝั่ง server (Server Component / Server Action)
// ห้าม import จากไฟล์ที่มี "use client" เด็ดขาด
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
