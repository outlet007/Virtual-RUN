import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, Button, Input, Label } from "@/components/ui";
import { createSubmission } from "@/lib/actions/submission";

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
                <option value="run">วิ่ง 🏃</option>
                <option value="walk">เดิน 🚶</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
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
                <Label>เวลา (นาที)</Label>
                <Input
                  name="duration_min"
                  type="number"
                  step="1"
                  min="1"
                  inputMode="numeric"
                />
              </div>
            </div>

            <div>
              <Label>วันที่วิ่ง</Label>
              <Input name="activity_date" type="date" defaultValue={today} required />
            </div>

            <div>
              <Label>ลิงก์รูปหลักฐาน (จาก Strava/Garmin ฯลฯ)</Label>
              <Input
                name="evidence_url"
                type="url"
                placeholder="https://..."
              />
              <p className="mt-1 text-xs text-ink/40">
                ระบบจะตรวจ pace อัตโนมัติ ถ้าผิดปกติจะส่งให้ผู้จัดตรวจก่อน
              </p>
            </div>

            <Button className="w-full" type="submit">
              บันทึกผล
            </Button>
          </Card>
        </form>
      )}
    </div>
  );
}
