import Link from "next/link";
import { redirect } from "next/navigation";
import { RegistrationTrendChart } from "@/components/admin/registration-trend-chart";
import { Card, HeadingIcon } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/admin";
import { buildEventLeaderboards, buildRegistrationSeries } from "@/lib/admin/day8";
import { getAdminShipments } from "@/lib/admin/shipments";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type Relation<T> = T | T[] | null;
type LeaderboardQueryRow = {
  distance_km: number | string;
  user_id: string;
  users: Relation<{ name: string | null; email: string | null }>;
  registrations: Relation<{
    event_id: string;
    events: Relation<{ id: string; title: string }>;
  }>;
};

function firstRelation<T>(value: Relation<T>) {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { role } = await requireAdmin();
  if (role === "admin") redirect("/admin/events");
  if (role === "staff") redirect("/admin/submissions");

  const { period: rawPeriod } = await searchParams;
  const period = rawPeriod === "monthly" ? "monthly" : "daily";
  const now = new Date();
  const registrationRangeStart = new Date(now);
  if (period === "monthly") registrationRangeStart.setUTCMonth(registrationRangeStart.getUTCMonth() - 12);
  else registrationRangeStart.setUTCDate(registrationRangeStart.getUTCDate() - 31);

  const db = createAdminClient();
  const [
    { count: openEvents },
    { count: pendingSubs },
    { count: pendingPayments },
    pendingShipmentRows,
    { count: totalMembers },
    { count: totalEvents },
    { count: totalRegistrations },
    { count: confirmedRegistrations },
    { count: approvedSubmissions },
    { data: distanceRows },
    { data: pointsRows },
    { count: medalsUnlocked },
    { count: redemptionsCount },
    { data: paidPayments },
    { data: registrationTrendRows, error: registrationTrendError },
    { data: leaderboardRows, error: leaderboardError },
  ] = await Promise.all([
    db.from("events").select("id", { count: "exact", head: true }).eq("status", "open"),
    db.from("submissions").select("id", { count: "exact", head: true }).in("status", ["pending", "flagged"]),
    db.from("payments").select("id", { count: "exact", head: true }).eq("status", "pending"),
    getAdminShipments({ status: "pending" }),
    db.from("users").select("id", { count: "exact", head: true }),
    db.from("events").select("id", { count: "exact", head: true }),
    db.from("registrations").select("id", { count: "exact", head: true }),
    db.from("registrations").select("id", { count: "exact", head: true }).eq("status", "confirmed"),
    db.from("submissions").select("id", { count: "exact", head: true }).eq("status", "approved"),
    db.from("submissions").select("distance_km").eq("status", "approved"),
    db.from("points_ledger").select("delta").gt("delta", 0),
    db.from("user_medals").select("id", { count: "exact", head: true }),
    db.from("redemptions").select("id", { count: "exact", head: true }),
    db.from("payments").select("amount").eq("status", "paid"),
    db.from("registrations").select("registered_at").gte("registered_at", registrationRangeStart.toISOString()),
    db
      .from("submissions")
      .select("distance_km, user_id, users(name, email), registrations!inner(event_id, events(id, title))")
      .eq("status", "approved"),
  ]);

  if (registrationTrendError) throw new Error(registrationTrendError.message);
  if (leaderboardError) throw new Error(leaderboardError.message);

  const totalDistanceKm = (distanceRows ?? []).reduce((sum, row) => sum + Number(row.distance_km), 0);
  const totalPointsAwarded = (pointsRows ?? []).reduce((sum, row) => sum + row.delta, 0);
  const totalRevenue = (paidPayments ?? []).reduce((sum, row) => sum + Number(row.amount), 0);
  const registrationSeries = buildRegistrationSeries(
    (registrationTrendRows ?? []).map((row) => ({ registeredAt: row.registered_at })),
    period,
    now,
  );
  const registrationSeriesTotal = registrationSeries.reduce((sum, point) => sum + point.registrations, 0);

  const leaderboards = buildEventLeaderboards(
    ((leaderboardRows ?? []) as unknown as LeaderboardQueryRow[]).flatMap((row) => {
      const registration = firstRelation(row.registrations);
      const event = firstRelation(registration?.events ?? null);
      const user = firstRelation(row.users);
      if (!registration || !event) return [];
      return [{
        eventId: registration.event_id,
        eventTitle: event.title,
        userId: row.user_id,
        userName: user?.name || user?.email || "ไม่ทราบชื่อ",
        distanceKm: Number(row.distance_km),
      }];
    }),
  );

  const actionStats = [
    { label: "งานที่เปิดรับสมัคร", value: openEvents ?? 0, href: "/admin/events" },
    { label: "ผลวิ่งรอตรวจ", value: pendingSubs ?? 0, href: "/admin/submissions" },
    { label: "การชำระเงินรอตรวจสอบ", value: pendingPayments ?? 0, href: "/admin/payments" },
    { label: "ผู้สมัครรอจัดส่งเหรียญ", value: pendingShipmentRows.length, href: "/admin/shipments" },
  ];

  const overviewStats = [
    { label: "สมาชิกทั้งหมด", value: (totalMembers ?? 0).toLocaleString("th-TH") },
    { label: "งานทั้งหมด", value: (totalEvents ?? 0).toLocaleString("th-TH") },
    { label: "ผู้สมัครทั้งหมด", value: (totalRegistrations ?? 0).toLocaleString("th-TH") },
    { label: "ผู้สมัครยืนยันแล้ว", value: (confirmedRegistrations ?? 0).toLocaleString("th-TH") },
    { label: "ผลวิ่งที่อนุมัติแล้ว", value: (approvedSubmissions ?? 0).toLocaleString("th-TH") },
    { label: "ระยะสะสมทั้งระบบ (กม.)", value: totalDistanceKm.toLocaleString("th-TH", { maximumFractionDigits: 1 }) },
    { label: "แต้มที่แจกไปแล้ว", value: totalPointsAwarded.toLocaleString("th-TH") },
    { label: "เหรียญที่ปลดล็อกแล้ว", value: (medalsUnlocked ?? 0).toLocaleString("th-TH") },
    { label: "รางวัลที่แลกแล้ว", value: (redemptionsCount ?? 0).toLocaleString("th-TH") },
    { label: "ยอดชำระเงินสะสม (บาท)", value: totalRevenue.toLocaleString("th-TH", { maximumFractionDigits: 2 }) },
  ];

  return (
    <div className="space-y-8">
      <section aria-labelledby="registration-trend-heading">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="registration-trend-heading" className="flex items-center gap-2 font-display text-lg font-bold">
              <HeadingIcon name="chart" />
              แนวโน้มผู้สมัคร{period === "daily" ? " 30 วันล่าสุด" : " 12 เดือนล่าสุด"}
            </h2>
            <p className="mt-1 text-sm text-ink/50">
              รวม {registrationSeriesTotal.toLocaleString("th-TH")} คนในช่วงที่เลือก
            </p>
          </div>
          <div className="flex rounded-xl border border-lane p-1" aria-label="เลือกช่วงเวลาของกราฟ">
            <Link
              href="/admin?period=daily"
              aria-current={period === "daily" ? "page" : undefined}
              className={`rounded-lg px-3 py-2 text-sm font-semibold ${period === "daily" ? "bg-ink text-paper" : "text-ink/60"}`}
            >
              รายวัน
            </Link>
            <Link
              href="/admin?period=monthly"
              aria-current={period === "monthly" ? "page" : undefined}
              className={`rounded-lg px-3 py-2 text-sm font-semibold ${period === "monthly" ? "bg-ink text-paper" : "text-ink/60"}`}
            >
              รายเดือน
            </Link>
          </div>
        </div>
        <Card>
          <div className="overflow-x-auto pb-1">
            <RegistrationTrendChart data={registrationSeries} />
          </div>
        </Card>
      </section>

      <section aria-labelledby="leaderboard-heading">
        <div className="mb-3">
          <h2 id="leaderboard-heading" className="flex items-center gap-2 font-display text-lg font-bold">
            <HeadingIcon name="trophy" className="text-medal" />
            อันดับระยะสะสมสูงสุดต่องาน
          </h2>
          <p className="mt-1 text-sm text-ink/50">Top 10 จากผลวิ่งที่อนุมัติแล้วเท่านั้น</p>
        </div>
        {leaderboards.length === 0 ? (
          <Card className="text-center text-ink/50">ยังไม่มีผลวิ่งที่อนุมัติสำหรับจัดอันดับ</Card>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {leaderboards.map((event) => (
              <Card key={event.eventId}>
                <h3 className="flex items-center gap-2 font-display font-bold">
                  <HeadingIcon name="calendar" className="size-4" />
                  {event.eventTitle}
                </h3>
                <ol className="mt-3 divide-y divide-lane">
                  {event.runners.map((runner, index) => (
                    <li key={runner.userId} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                      <span className={`grid size-8 shrink-0 place-items-center rounded-full font-mono text-sm font-bold ${index < 3 ? "bg-medal-soft text-medal" : "bg-lane text-ink/60"}`}>
                        {index + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate font-medium">{runner.userName}</span>
                      <strong className="shrink-0 font-mono text-primary-dark tnum">
                        {runner.distanceKm.toLocaleString("th-TH", { maximumFractionDigits: 2 })} กม.
                      </strong>
                    </li>
                  ))}
                </ol>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold">
          <HeadingIcon name="clipboard" />
          ต้องดำเนินการ
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {actionStats.map((stat) => (
            <Link key={stat.href} href={stat.href}>
              <Card className="hover:border-primary/40">
                <p className="text-xs uppercase tracking-wider text-ink/40">{stat.label}</p>
                <p className="mt-1 font-mono text-4xl font-bold tnum">{stat.value}</p>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold">
          <HeadingIcon name="overview" />
          ภาพรวมระบบ
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {overviewStats.map((stat) => (
            <Card key={stat.label}>
              <p className="text-xs uppercase tracking-wider text-ink/40">{stat.label}</p>
              <p className="mt-1 font-mono text-2xl font-bold tnum">{stat.value}</p>
            </Card>
          ))}
        </div>
      </section>

    </div>
  );
}
