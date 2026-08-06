import Link from "next/link";
import { redirect } from "next/navigation";
import { PartyPopper, CheckCircle2, FileText, Footprints, PersonStanding } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, LinkButton, Button, Select } from "@/components/ui";
import { formatKm, formatDate } from "@/lib/utils";
import { assignPendingActivity } from "@/lib/actions/strava";

export const dynamic = "force-dynamic";

type Reg = {
  id: string;
  status: string;
  packages: { name: string } | null;
  events: { title: string } | null;
};
type Sub = {
  registration_id: string;
  distance_km: number;
  status: string;
};
type PendingActivity = {
  id: string;
  activity_type: string;
  distance_km: number;
  duration_sec: number | null;
  activity_date: string;
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    welcome?: string;
    submitted?: string;
    ocr?: string;
    pending?: string;
    assigned?: string;
    error?: string;
  }>;
}) {
  const { welcome, submitted, ocr, assigned, error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("name, email, phone, avatar_url, created_at")
    .eq("id", user.id)
    .single();

  const { data: regsRaw } = await supabase
    .from("registrations")
    .select("id, status, packages(name), events(title)")
    .eq("user_id", user.id)
    .order("registered_at", { ascending: false });

  const { data: subsRaw } = await supabase
    .from("submissions")
    .select("registration_id, distance_km, status")
    .eq("user_id", user.id);

  const { data: pendingActivitiesRaw } = await supabase
    .from("strava_pending_activities")
    .select("id, activity_type, distance_km, duration_sec, activity_date")
    .eq("user_id", user.id)
    .order("activity_date", { ascending: false });

  const { data: ledger } = await supabase.from("points_ledger").select("delta");
  const points = (ledger ?? []).reduce((sum, l) => sum + l.delta, 0);

  const regs = (regsRaw ?? []) as unknown as Reg[];
  const subs = (subsRaw ?? []) as Sub[];
  const pendingActivities = (pendingActivitiesRaw ?? []) as PendingActivity[];
  const confirmedRegs = regs.filter((r) => r.status === "confirmed");

  const totalApproved = subs
    .filter((s) => s.status === "approved")
    .reduce((sum, s) => sum + Number(s.distance_km), 0);
  const pendingCount = subs.filter((s) => s.status === "pending" || s.status === "flagged").length;

  return (
    <div className="space-y-8">
      {welcome && (
        <div className="flex items-center gap-2 rounded-xl bg-primary-soft px-4 py-3 text-sm text-primary-dark">
          <PartyPopper className="h-4 w-4 shrink-0" /> สมัครสำเร็จ! เริ่มบันทึกผลวิ่งได้เลย
        </div>
      )}
      {submitted && (
        <div className="flex items-center gap-2 rounded-xl bg-primary-soft px-4 py-3 text-sm text-primary-dark">
          {submitted === "approved" ? (
            <>
              <CheckCircle2 className="h-4 w-4 shrink-0" /> บันทึกผลสำเร็จ — ระยะถูกเพิ่มเข้ายอดสะสมแล้ว
            </>
          ) : (
            <>
              <FileText className="h-4 w-4 shrink-0" />{" "}
              {ocr === "mismatch"
                ? "บันทึกผลแล้ว — ระยะที่ OCR อ่านได้ไม่ตรงกับค่าที่กรอก รอเจ้าหน้าที่ตรวจสอบ"
                : ocr === "unreadable"
                  ? "บันทึกผลแล้ว — OCR อ่านระยะจากภาพไม่ชัด รอเจ้าหน้าที่ตรวจสอบ"
                  : ocr === "error"
                    ? "บันทึกผลแล้ว — ระบบ OCR ประมวลผลภาพไม่สำเร็จ รอเจ้าหน้าที่ตรวจสอบ"
                    : "บันทึกผลแล้ว — รอผู้จัดงานตรวจสอบ"}
            </>
          )}
        </div>
      )}
      {assigned && (
        <div className="flex items-center gap-2 rounded-xl bg-primary-soft px-4 py-3 text-sm text-primary-dark">
          <CheckCircle2 className="h-4 w-4 shrink-0" /> จับคู่กิจกรรมกับใบสมัครแล้ว
        </div>
      )}
      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* การ์ดโปรไฟล์ย่อ */}
      <Card className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {profile?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt=""
              className="h-14 w-14 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-ink font-display text-lg font-bold text-primary">
              {(profile?.name ?? user.email ?? "?").trim().charAt(0).toUpperCase()}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate font-display text-lg font-bold">{profile?.name ?? "—"}</p>
            <p className="truncate text-sm text-ink/50">{profile?.email ?? user.email}</p>
            {profile?.created_at && (
              <p className="text-xs text-ink/40">สมาชิกตั้งแต่ {formatDate(profile.created_at)}</p>
            )}
          </div>
        </div>
        <LinkButton href="/profile" variant="ghost" icon="edit">
          แก้ไขโปรไฟล์
        </LinkButton>
      </Card>

      {/* กิจกรรมจาก Strava ที่ต้องเลือกใบสมัครเอง */}
      {pendingActivities.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-xl font-bold">
            กิจกรรมจาก Strava ที่ต้องเลือกใบสมัคร
          </h2>
          <p className="text-sm text-ink/50">
            ระบบจับคู่อัตโนมัติไม่ได้ (ไม่มี หรือมีมากกว่า 1 ใบสมัครที่ตรงช่วงวันงาน) เลือกเองได้เลย
          </p>
          <div className="space-y-3">
            {pendingActivities.map((p) => (
              <Card key={p.id} className="flex flex-col items-stretch gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-ink/60">
                    {p.activity_type === "walk" ? (
                      <PersonStanding className="h-5 w-5" />
                    ) : (
                      <Footprints className="h-5 w-5" />
                    )}
                  </span>
                  <span className="font-mono text-sm tnum">
                    {formatKm(Number(p.distance_km))} km
                  </span>
                  <span className="text-xs text-ink/40">
                    {new Date(p.activity_date).toLocaleDateString("th-TH")}
                  </span>
                </div>
                <form action={assignPendingActivity} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input type="hidden" name="pending_id" value={p.id} />
                  <Select name="registration_id" required className="w-full sm:w-56">
                    <option value="">เลือกใบสมัคร...</option>
                    {confirmedRegs.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.events?.title} — {r.packages?.name}
                      </option>
                    ))}
                  </Select>
                  <Button type="submit" icon="confirm">เลือก</Button>
                </form>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* สรุปยอดรวม */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-ink text-paper">
          <p className="text-xs uppercase tracking-wider text-paper">ระยะสะสมรวม</p>
          <p className="mt-1 font-mono text-4xl font-bold text-primary tnum">
            {formatKm(totalApproved)}
            <span className="ml-1 text-base font-normal text-paper">km</span>
          </p>
        </Card>
        <Link href="/dashboard/events">
          <Card className="hover:border-primary/40">
            <p className="text-xs uppercase tracking-wider text-ink/40">งานที่สมัคร</p>
            <p className="mt-1 font-mono text-4xl font-bold tnum">{regs.length}</p>
          </Card>
        </Link>
        <Link href="/dashboard/history">
          <Card className="hover:border-primary/40">
            <p className="text-xs uppercase tracking-wider text-ink/40">รอตรวจสอบ</p>
            <p className="mt-1 font-mono text-4xl font-bold text-medal tnum">{pendingCount}</p>
          </Card>
        </Link>
        <Link href="/dashboard/rewards">
          <Card className="hover:border-primary/40">
            <p className="text-xs uppercase tracking-wider text-ink/40">แต้มสะสมของฉัน</p>
            <p className="mt-1 font-mono text-4xl font-bold text-[#F5A524] tnum">{points}</p>
          </Card>
        </Link>
      </section>

      <div>
        <LinkButton
          href="/dashboard/submit"
          icon="upload"
          className="w-full justify-center py-6 text-[24px] leading-none [&_svg]:size-6"
        >
          บันทึกผลวิ่ง
        </LinkButton>
      </div>
    </div>
  );
}
