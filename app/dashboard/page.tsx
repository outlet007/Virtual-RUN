import Link from "next/link";
import { redirect } from "next/navigation";
import {
  PartyPopper,
  CheckCircle2,
  FileText,
  Footprints,
  PersonStanding,
  Medal,
  Flag,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, Badge, LinkButton, Button, Select } from "@/components/ui";
import { TrackProgress } from "@/components/ui";
import { formatKm, formatDate } from "@/lib/utils";
import { assignPendingActivity } from "@/lib/actions/strava";

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
type EarnedMedal = {
  id: string;
  medals: { name: string; tier: string; image_url: string | null } | null;
};

const tierLabel: Record<string, string> = {
  bronze: "บรอนซ์",
  silver: "เงิน",
  gold: "ทอง",
  legendary: "ตำนาน",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    welcome?: string;
    submitted?: string;
    pending?: string;
    assigned?: string;
    error?: string;
  }>;
}) {
  const { welcome, submitted, assigned, error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // user social login ครั้งแรกยังไม่เคยยอมรับ PDPA (ข้ามฟอร์มสมัครสมาชิกที่มี checkbox มา)
  const { data: privacyConsent } = await supabase
    .from("consents")
    .select("id")
    .eq("user_id", user.id)
    .eq("type", "privacy")
    .maybeSingle();
  if (!privacyConsent) redirect("/consent");

  const { data: profile } = await supabase
    .from("users")
    .select("name, email, phone, avatar_url, created_at")
    .eq("id", user.id)
    .single();

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

  const { data: pendingActivitiesRaw } = await supabase
    .from("strava_pending_activities")
    .select("id, activity_type, distance_km, duration_sec, activity_date")
    .eq("user_id", user.id)
    .order("activity_date", { ascending: false });

  const { data: ledger } = await supabase.from("points_ledger").select("delta");
  const points = (ledger ?? []).reduce((sum, l) => sum + l.delta, 0);

  const { data: earnedMedalsRaw } = await supabase
    .from("user_medals")
    .select("id, medals(name, tier, image_url)")
    .eq("user_id", user.id)
    .order("unlocked_at", { ascending: false });

  const regs = (regsRaw ?? []) as unknown as Reg[];
  const subs = (subsRaw ?? []) as Sub[];
  const pendingActivities = (pendingActivitiesRaw ?? []) as PendingActivity[];
  const earnedMedals = (earnedMedalsRaw ?? []) as unknown as EarnedMedal[];
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
              <FileText className="h-4 w-4 shrink-0" /> บันทึกผลแล้ว — รอผู้จัดงานตรวจสอบ
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

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[3fr_7fr]">
        {/* ซ้าย: ข้อมูล user profile */}
        <div className="space-y-4">
          <Card className="space-y-4">
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
                <p className="truncate font-display text-lg font-bold">
                  {profile?.name ?? "—"}
                </p>
                <p className="truncate text-sm text-ink/50">{profile?.email ?? user.email}</p>
              </div>
            </div>
            {profile?.phone && (
              <p className="text-sm text-ink/70">โทร {profile.phone}</p>
            )}
            {profile?.created_at && (
              <p className="text-xs text-ink/40">
                สมาชิกตั้งแต่ {formatDate(profile.created_at)}
              </p>
            )}
            <LinkButton href="/profile" variant="ghost" className="w-full">
              แก้ไขโปรไฟล์
            </LinkButton>
          </Card>
        </div>

        {/* ขวา: เนื้อหาเดิมของแดชบอร์ด */}
        <div className="space-y-8">
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
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
        <Link href="/rewards">
          <Card className="hover:border-primary/40">
            <p className="text-xs uppercase tracking-wider text-ink/40">
              แต้มสะสม
            </p>
            <p className="mt-1 font-mono text-4xl font-bold text-primary-dark tnum">
              {points}
            </p>
          </Card>
        </Link>
      </section>

      {/* เหรียญที่ปลดล็อกแล้ว */}
      {earnedMedals.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-xl font-bold">เหรียญที่ได้รับ</h2>
          <div className="flex flex-wrap gap-3">
            {earnedMedals.map((em) => (
              <Card key={em.id} className="flex items-center gap-3 py-3">
                <Medal className="h-7 w-7 text-medal" />
                <div>
                  <p className="font-semibold">{em.medals?.name}</p>
                  <Badge className="bg-medal-soft text-medal">
                    {tierLabel[em.medals?.tier ?? ""] ?? em.medals?.tier}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

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
                      <p className="font-mono text-sm text-muted tnum">
                        BIB {r.bib_number}
                      </p>
                    )}
                    {r.status === "pending" ? (
                      <Link href={`/dashboard/pay/${r.id}`}>
                        <Badge className="bg-medal-soft text-medal hover:underline">
                          รอชำระเงิน →
                        </Badge>
                      </Link>
                    ) : (
                      <Badge
                        className={
                          finished
                            ? "bg-primary-soft text-primary-dark"
                            : "bg-lane text-muted"
                        }
                      >
                        {finished ? (
                          <span className="inline-flex items-center gap-1">
                            <Flag className="h-3 w-3" /> ครบเป้า
                          </span>
                        ) : (
                          "กำลังสะสม"
                        )}
                      </Badge>
                    )}
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
                  <span className="text-ink/60">
                    {s.activity_type === "walk" ? (
                      <PersonStanding className="h-5 w-5" />
                    ) : (
                      <Footprints className="h-5 w-5" />
                    )}
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
      </div>
    </div>
  );
}
