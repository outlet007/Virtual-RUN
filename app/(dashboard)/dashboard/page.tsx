import Link from "next/link";
import { redirect } from "next/navigation";
import { PartyPopper, CheckCircle2, FileText, Footprints, PersonStanding } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, HeadingIcon, LinkButton, Button, Select } from "@/components/ui";
import { formatKm, formatDate } from "@/lib/utils";
import { assignPendingActivity } from "@/lib/actions/strava";
import { getLocale } from "@/lib/i18n/server";
import { pickLocalized, tx } from "@/lib/i18n/shared";

export const dynamic = "force-dynamic";

type Reg = {
  id: string;
  status: string;
  packages: { name: string; name_en: string | null } | null;
  events: { title: string; title_en: string | null } | null;
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
  const [supabase, locale] = await Promise.all([createClient(), getLocale()]);
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
    .select("id, status, packages(name, name_en), events(title, title_en)")
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
          <PartyPopper className="h-4 w-4 shrink-0" /> {tx(locale, "สมัครสำเร็จ! เริ่มบันทึกผลวิ่งได้เลย", "Registration complete! You can now submit activities.")}
        </div>
      )}
      {submitted && (
        <div className="flex items-center gap-2 rounded-xl bg-primary-soft px-4 py-3 text-sm text-primary-dark">
          {submitted === "approved" ? (
            <>
              <CheckCircle2 className="h-4 w-4 shrink-0" /> {tx(locale, "บันทึกผลสำเร็จ — ระยะถูกเพิ่มเข้ายอดสะสมแล้ว", "Activity approved and added to your total distance.")}
            </>
          ) : (
            <>
              <FileText className="h-4 w-4 shrink-0" />{" "}
              {ocr === "mismatch"
                ? tx(locale, "บันทึกผลแล้ว — ระยะที่ OCR อ่านได้ไม่ตรงกับค่าที่กรอก รอเจ้าหน้าที่ตรวจสอบ", "Submitted. The OCR distance differs from your entry and is awaiting review.")
                : ocr === "unreadable"
                  ? tx(locale, "บันทึกผลแล้ว — OCR อ่านระยะจากภาพไม่ชัด รอเจ้าหน้าที่ตรวจสอบ", "Submitted. OCR could not clearly read the distance and it is awaiting review.")
                  : ocr === "error"
                    ? tx(locale, "บันทึกผลแล้ว — ระบบ OCR ประมวลผลภาพไม่สำเร็จ รอเจ้าหน้าที่ตรวจสอบ", "Submitted. OCR processing failed and it is awaiting review.")
                    : tx(locale, "บันทึกผลแล้ว — รอผู้จัดงานตรวจสอบ", "Submitted and awaiting organizer review.")}
            </>
          )}
        </div>
      )}
      {assigned && (
        <div className="flex items-center gap-2 rounded-xl bg-primary-soft px-4 py-3 text-sm text-primary-dark">
          <CheckCircle2 className="h-4 w-4 shrink-0" /> {tx(locale, "จับคู่กิจกรรมกับใบสมัครแล้ว", "Activity matched to the registration.")}
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
              <p className="text-xs text-ink/40">{tx(locale, "สมาชิกตั้งแต่", "Member since")} {formatDate(profile.created_at)}</p>
            )}
          </div>
        </div>
        <LinkButton href="/profile" variant="ghost" icon="edit">
        {tx(locale, "แก้ไขโปรไฟล์", "Edit profile")}
        </LinkButton>
      </Card>

      {/* กิจกรรมจาก Strava ที่ต้องเลือกใบสมัครเอง */}
      {pendingActivities.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 font-display text-xl font-bold">
            <HeadingIcon name="activity" />
            {tx(locale, "กิจกรรมจาก Strava ที่ต้องเลือกใบสมัคร", "Strava activities needing an event")}
          </h2>
          <p className="text-sm text-ink/50">
            {tx(locale, "ระบบจับคู่อัตโนมัติไม่ได้ (ไม่มี หรือมีมากกว่า 1 ใบสมัครที่ตรงช่วงวันงาน) เลือกเองได้เลย", "Automatic matching was not possible. Choose the correct registration below.")}
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
                    <option value="">{tx(locale, "เลือกใบสมัคร...", "Choose registration...")}</option>
                    {confirmedRegs.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.events ? pickLocalized(locale, r.events.title, r.events.title_en) : ""} — {r.packages ? pickLocalized(locale, r.packages.name, r.packages.name_en) : ""}
                      </option>
                    ))}
                  </Select>
                  <Button type="submit" icon="confirm">{tx(locale, "เลือก", "Choose")}</Button>
                </form>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* สรุปยอดรวม */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-ink text-paper">
          <p className="text-xs uppercase tracking-wider text-paper">{tx(locale, "ระยะสะสมรวม", "Total distance")}</p>
          <p className="mt-1 font-mono text-4xl font-bold text-primary tnum">
            {formatKm(totalApproved)}
            <span className="ml-1 text-base font-normal text-paper">km</span>
          </p>
        </Card>
        <Link href="/dashboard/events">
          <Card className="hover:border-primary/40">
            <p className="text-xs uppercase tracking-wider text-ink/40">{tx(locale, "งานที่สมัคร", "Joined events")}</p>
            <p className="mt-1 font-mono text-4xl font-bold tnum">{regs.length}</p>
          </Card>
        </Link>
        <Link href="/dashboard/history">
          <Card className="hover:border-primary/40">
            <p className="text-xs uppercase tracking-wider text-ink/40">{tx(locale, "รอตรวจสอบ", "Pending review")}</p>
            <p className="mt-1 font-mono text-4xl font-bold text-[#fec81d] tnum">{pendingCount}</p>
          </Card>
        </Link>
        <Link href="/dashboard/rewards">
          <Card className="hover:border-primary/40">
            <p className="text-xs uppercase tracking-wider text-ink/40">{tx(locale, "แต้มสะสมของฉัน", "My points")}</p>
            <p className="mt-1 font-mono text-4xl font-bold text-[#fec81d] tnum">{points}</p>
          </Card>
        </Link>
      </section>

      <div>
        <LinkButton
          href="/dashboard/events"
          icon="upload"
          className="w-full justify-center py-6 text-[24px] leading-none [&_svg]:size-6"
        >
          {tx(locale, "บันทึกผลวิ่ง", "Submit activity")}
        </LinkButton>
      </div>
    </div>
  );
}
