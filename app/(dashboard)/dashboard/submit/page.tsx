import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, Input, Label } from "@/components/ui";
import { createSubmission } from "@/lib/actions/submission";
import { SubmissionSubmitButton } from "@/components/submission-submit-button";

export const dynamic = "force-dynamic";

type Reg = {
  id: string;
  packages: { name: string } | null;
  events: { title: string } | null;
};

export default async function SubmitPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: regsRaw } = await supabase
    .from("registrations")
    .select("id, packages(name), events(title)")
    .eq("user_id", user.id)
    .eq("status", "confirmed");

  const regs = (regsRaw ?? []) as unknown as Reg[];
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Link href="/dashboard" className="text-sm text-ink/50 hover:text-ink">
        ← แดชบอร์ด
      </Link>
      <h1 className="font-display text-2xl font-bold">บันทึกผลวิ่ง</h1>

      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {regs.length === 0 ? (
        <Card className="text-center text-ink/50">
          ต้องสมัครงาน (ที่ยืนยันแล้ว) ก่อนจึงบันทึกผลได้ —{" "}
          <a href="/" className="text-primary-dark underline">
            ไปดูงานวิ่ง
          </a>
        </Card>
      ) : (
        <form action={createSubmission}>
          <Card className="space-y-4">
            <div>
              <Label>งานที่จะบันทึกผล</Label>
              <select
                name="registration_id"
                required
                className="h-11 w-full rounded-xl border border-lane bg-white px-3 text-sm outline-none focus:border-primary"
              >
                {regs.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.events?.title} — {r.packages?.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label>ประเภท</Label>
              <select
                name="activity_type"
                className="h-11 w-full rounded-xl border border-lane bg-white px-3 text-sm outline-none focus:border-primary"
              >
                <option value="run">วิ่ง</option>
                <option value="walk">เดิน</option>
              </select>
            </div>

            <div>
              <Label>ระยะ (km)</Label>
              <Input
                name="distance_km"
                type="number"
                step="0.01"
                min="0.1"
                inputMode="decimal"
                required
              />
            </div>

            <div>
              <Label>เวลา (ชั่วโมง : นาที : วินาที)</Label>
              <div className="grid grid-cols-3 gap-3">
                <Input
                  name="duration_hours"
                  type="number"
                  step="1"
                  min="0"
                  max="99"
                  inputMode="numeric"
                  defaultValue="0"
                  aria-label="ชั่วโมง"
                  placeholder="ชม."
                  required
                />
                <Input
                  name="duration_minutes"
                  type="number"
                  step="1"
                  min="0"
                  max="59"
                  inputMode="numeric"
                  defaultValue="0"
                  aria-label="นาที"
                  placeholder="นาที"
                  required
                />
                <Input
                  name="duration_seconds"
                  type="number"
                  step="1"
                  min="0"
                  max="59"
                  inputMode="numeric"
                  defaultValue="0"
                  aria-label="วินาที"
                  placeholder="วินาที"
                  required
                />
              </div>
              <p className="mt-1 text-xs text-ink/40">
                ตัวอย่าง 1 ชั่วโมง 30 นาที กรอก 01 : 30 : 00
              </p>
            </div>

            <div>
              <Label>วันที่วิ่ง</Label>
              <Input name="activity_date" type="date" defaultValue={today} required />
            </div>

            <div>
              <Label>อัปโหลดรูปหลักฐาน (screenshot จากแอปวิ่ง)</Label>
              <input
                name="evidence_file"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                required
                className="block w-full text-sm text-ink/70 file:mr-3 file:rounded-lg file:border-0 file:bg-lane file:px-3 file:py-2 file:text-sm file:font-medium hover:file:bg-lane/70"
              />
              <p className="mt-1 text-xs text-ink/40">
                รองรับ PNG, JPG และ WebP — ระบบ OCR จะอ่านระยะจากภาพและเปรียบเทียบกับค่าที่กรอก
              </p>
            </div>

            <SubmissionSubmitButton />
          </Card>
        </form>
      )}
    </div>
  );
}
