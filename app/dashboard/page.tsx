import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, Badge, LinkButton, Button, Select } from "@/components/ui";
import { TrackProgress } from "@/components/ui";
import { formatKm } from "@/lib/utils";
import { disconnectStrava, assignPendingActivity } from "@/lib/actions/strava";

export const dynamic = "force-dynamic";

type Reg = {
  id: string;
  bib_number: string | null;
  status: string;
  packages: {
    name: string;
    target_distance_km: number;
    has_physical_medal: boolean;
  } | null;
  events: { title: string } | null;
};
type Sub = {
  registration_id: string;
  distance_km: number;
  status: string;
  activity_type: string;
  activity_date: string;
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
    pending?: string;
    strava?: string;
    assigned?: string;
    error?: string;
  }>;
}) {
  const { welcome, submitted, strava, assigned, error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: regsRaw } = await supabase
    .from("registrations")
    .select(
      "id, bib_number, status, packages(name, target_distance_km, has_physical_medal), events(title)",
    )
    .eq("user_id", user.id)
    .order("registered_at", { ascending: false });

  const { data: subsRaw } = await supabase
    .from("submissions")
    .select("registration_id, distance_km, status, activity_type, activity_date")
    .eq("user_id", user.id)
    .order("activity_date", { ascending: false });

  const { data: stravaConnection } = await supabase
    .from("strava_connections")
    .select("strava_athlete_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: pendingActivitiesRaw } = await supabase
    .from("strava_pending_activities")
    .select("id, activity_type, distance_km, duration_sec, activity_date")
    .eq("user_id", user.id)
    .order("activity_date", { ascending: false });

  const regs = (regsRaw ?? []) as unknown as Reg[];
  const subs = (subsRaw ?? []) as Sub[];
  const pendingActivities = (pendingActivitiesRaw ?? []) as PendingActivity[];
  const confirmedRegs = regs.filter((r) => r.status === "confirmed");

  // รวมระยะที่อนุมัติแล้ว ต่อ registration
  const approvedByReg = new Map<string, number>();
  let totalApproved = 0;
  for (const s of subs) {
    if (s.status === "approved") {
      approvedByReg.set(
        s.registration_id,
        (approvedByReg.get(s.registration_id) ?? 0) + Number(s.distance_km),
      );
      totalApproved += Number(s.distance_km);
    }
  }
  const pendingCount = subs.filter(
    (s) => s.status === "pending" || s.status === "flagged",
  ).length;

  return (
    <div className="space-y-8">
      {welcome && (
        <div className="rounded-xl bg-primary-soft px-4 py-3 text-sm text-primary-dark">
          🎉 สมัครสำเร็จ! เริ่มบันทึกผลวิ่งได้เลย
        </div>
      )}
      {submitted && (
        <div className="rounded-xl bg-primary-soft px-4 py-3 text-sm text-primary-dark">
          {submitted === "approved"
            ? "✅ บันทึกผลสำเร็จ — ระยะถูกเพิ่มเข้ายอดสะสมแล้ว"
            : "📝 บันทึกผลแล้ว — รอผู้จัดงานตรวจสอบ"}
        </div>
      )}
      {strava === "connected" && (
        <div className="rounded-xl bg-primary-soft px-4 py-3 text-sm text-primary-dark">
          🔗 เชื่อมต่อ Strava สำเร็จ — กิจกรรมใหม่จะถูกดึงเข้าระบบอัตโนมัติ
        </div>
      )}
      {strava === "disconnected" && (
        <div className="rounded-xl bg-lane px-4 py-3 text-sm text-ink/60">
          ตัดการเชื่อมต่อ Strava แล้ว
        </div>
      )}
      {assigned && (
        <div className="rounded-xl bg-primary-soft px-4 py-3 text-sm text-primary-dark">
          ✅ จับคู่กิจกรรมกับใบสมัครแล้ว
        </div>
      )}
      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Strava */}
      <Card className="flex items-center justify-between">
        <div>
          <p className="font-display font-bold">Strava</p>
          <p className="text-sm text-ink/50">
            {stravaConnection
              ? "เชื่อมต่ออยู่ — กิจกรรมวิ่ง/เดินใหม่จะถูกดึงเข้าระบบอัตโนมัติ"
              : "เชื่อมต่อ Strava เพื่อให้ระบบดึงผลวิ่งให้อัตโนมัติ ไม่ต้องอัปโหลดเอง"}
          </p>
        </div>
        {stravaConnection ? (
          <form action={disconnectStrava}>
            <Button variant="ghost" type="submit">
              ตัดการเชื่อมต่อ
            </Button>
          </form>
        ) : (
          <LinkButton href="/api/strava/connect">เชื่อมต่อ Strava</LinkButton>
        )}
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
              <Card key={p.id} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{p.activity_type === "walk" ? "🚶" : "🏃"}</span>
                  <span className="font-mono text-sm tnum">
                    {formatKm(Number(p.distance_km))} km
                  </span>
                  <span className="text-xs text-ink/40">
                    {new Date(p.activity_date).toLocaleDateString("th-TH")}
                  </span>
                </div>
                <form action={assignPendingActivity} className="flex items-center gap-2">
                  <input type="hidden" name="pending_id" value={p.id} />
                  <Select name="registration_id" required className="w-56">
                    <option value="">เลือกใบสมัคร...</option>
                    {confirmedRegs.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.events?.title} — {r.packages?.name}
                      </option>
                    ))}
                  </Select>
                  <Button type="submit">เลือก</Button>
                </form>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* สรุปยอดรวม */}
      <section className="grid gap-4 sm:grid-cols-3">
        <Card className="bg-ink text-paper">
          <p className="text-xs uppercase tracking-wider text-paper/50">
            ระยะสะสมรวม
          </p>
          <p className="mt-1 font-mono text-4xl font-bold text-primary tnum">
            {formatKm(totalApproved)}
            <span className="ml-1 text-base font-normal text-paper/40">km</span>
          </p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wider text-ink/40">
            งานที่สมัคร
          </p>
          <p className="mt-1 font-mono text-4xl font-bold tnum">{regs.length}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wider text-ink/40">
            รอตรวจสอบ
          </p>
          <p className="mt-1 font-mono text-4xl font-bold text-medal tnum">
            {pendingCount}
          </p>
        </Card>
      </section>

      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold">งานของฉัน</h2>
        <LinkButton href="/dashboard/submit">+ บันทึกผลวิ่ง</LinkButton>
      </div>

      {regs.length === 0 ? (
        <Card className="text-center text-ink/50">
          ยังไม่ได้สมัครงาน — <a href="/" className="text-primary-dark underline">ไปดูงานวิ่ง</a>
        </Card>
      ) : (
        <div className="space-y-4">
          {regs.map((r) => {
            const done = approvedByReg.get(r.id) ?? 0;
            const target = r.packages?.target_distance_km ?? 1;
            const finished = done >= target;
            return (
              <Card key={r.id} className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-ink/50">{r.events?.title}</p>
                    <p className="font-display text-lg font-bold">
                      {r.packages?.name}
                    </p>
                  </div>
                  <div className="text-right">
                    {r.bib_number && (
                      <p className="font-mono text-sm text-ink/60 tnum">
                        BIB {r.bib_number}
                      </p>
                    )}
                    <Badge
                      className={
                        finished
                          ? "bg-primary-soft text-primary-dark"
                          : r.status === "pending"
                            ? "bg-medal-soft text-medal"
                            : "bg-lane text-ink/60"
                      }
                    >
                      {finished
                        ? "🏁 ครบเป้า"
                        : r.status === "pending"
                          ? "รอชำระเงิน"
                          : "กำลังสะสม"}
                    </Badge>
                  </div>
                </div>
                <div>
                  <div className="mb-1 flex justify-between font-mono text-sm tnum">
                    <span className="font-bold text-primary-dark">
                      {formatKm(done)} km
                    </span>
                    <span className="text-ink/40">/ {target} km</span>
                  </div>
                  <TrackProgress current={done} target={target} />
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ประวัติผลวิ่งล่าสุด */}
      {subs.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-xl font-bold">ผลวิ่งล่าสุด</h2>
          <Card className="divide-y divide-lane p-0">
            {subs.slice(0, 8).map((s, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-lg">
                    {s.activity_type === "walk" ? "🚶" : "🏃"}
                  </span>
                  <span className="font-mono text-sm tnum">
                    {formatKm(Number(s.distance_km))} km
                  </span>
                  <span className="text-xs text-ink/40">
                    {new Date(s.activity_date).toLocaleDateString("th-TH")}
                  </span>
                </div>
                <Badge
                  className={
                    s.status === "approved"
                      ? "bg-primary-soft text-primary-dark"
                      : s.status === "rejected"
                        ? "bg-red-50 text-red-600"
                        : "bg-medal-soft text-medal"
                  }
                >
                  {s.status === "approved"
                    ? "อนุมัติ"
                    : s.status === "rejected"
                      ? "ปฏิเสธ"
                      : "รอตรวจ"}
                </Badge>
              </div>
            ))}
          </Card>
        </section>
      )}
    </div>
  );
}
