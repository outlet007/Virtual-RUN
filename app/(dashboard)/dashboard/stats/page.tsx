import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, HeadingIcon } from "@/components/ui";
import { PersonalDistanceChart } from "@/components/dashboard/personal-distance-chart";
import { buildPersonalDistanceSeries } from "@/lib/personal-stats";
import { formatKm } from "@/lib/utils";
import { getLocale } from "@/lib/i18n/server";
import { tx } from "@/lib/i18n/shared";

export const dynamic = "force-dynamic";

type Sub = {
  distance_km: number;
  status: string;
  activity_type: string;
  activity_date: string;
};

export default async function StatsPage() {
  const [supabase, locale] = await Promise.all([createClient(), getLocale()]);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: subsRaw } = await supabase
    .from("submissions")
    .select("distance_km, status, activity_type, activity_date")
    .eq("user_id", user.id);

  const { data: regsRaw } = await supabase
    .from("registrations")
    .select("status")
    .eq("user_id", user.id);

  const { data: ledger } = await supabase.from("points_ledger").select("delta");
  const { count: medalsCount } = await supabase
    .from("user_medals")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const subs = (subsRaw ?? []) as Sub[];
  const regs = (regsRaw ?? []) as { status: string }[];
  const points = (ledger ?? []).reduce((sum, l) => sum + l.delta, 0);

  const approved = subs.filter((s) => s.status === "approved");
  const totalKm = approved.reduce((sum, s) => sum + Number(s.distance_km), 0);
  const runKm = approved
    .filter((s) => s.activity_type === "run")
    .reduce((sum, s) => sum + Number(s.distance_km), 0);
  const walkKm = approved
    .filter((s) => s.activity_type === "walk")
    .reduce((sum, s) => sum + Number(s.distance_km), 0);
  const distanceSeries = buildPersonalDistanceSeries(
    approved.map((submission) => ({
      activityDate: submission.activity_date,
      activityType: submission.activity_type === "walk" ? "walk" : "run",
      distanceKm: Number(submission.distance_km),
    })),
  );

  const stats = [
    { label: tx(locale, "ระยะสะสมรวม", "Total distance"), value: `${formatKm(totalKm)} km` },
    { label: tx(locale, "ระยะวิ่งสะสม", "Running distance"), value: `${formatKm(runKm)} km` },
    { label: tx(locale, "ระยะเดินสะสม", "Walking distance"), value: `${formatKm(walkKm)} km` },
    { label: tx(locale, "แต้มสะสม", "Points"), value: points },
    { label: tx(locale, "เหรียญที่ได้รับ", "Medals earned"), value: medalsCount ?? 0 },
    { label: tx(locale, "งานที่สมัคร", "Joined events"), value: regs.length },
    { label: tx(locale, "งานที่ยืนยันแล้ว", "Confirmed events"), value: regs.filter((r) => r.status === "confirmed").length },
    { label: tx(locale, "ผลวิ่งที่บันทึกทั้งหมด", "All submissions"), value: subs.length },
    { label: tx(locale, "ผลวิ่งที่อนุมัติแล้ว", "Approved submissions"), value: approved.length },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 font-display text-xl font-bold">
          <HeadingIcon name="chart" />
          {tx(locale, "สถิติของฉัน", "My stats")}
        </h2>
        <p className="mt-1 text-sm text-muted">{tx(locale, "ภาพรวมผลงานสะสมทั้งหมดของบัญชีนี้", "Overview of all activity on this account")}</p>
      </div>
      <section aria-labelledby="personal-distance-heading">
        <div className="mb-3">
          <h3 id="personal-distance-heading" className="flex items-center gap-2 font-display text-lg font-bold">
            <HeadingIcon name="activity" />
            {tx(locale, "ระยะทาง 30 วันล่าสุด", "Distance over the last 30 days")}
          </h3>
          <p className="mt-1 text-sm text-muted">
            {tx(locale, "แสดงเฉพาะผลที่อนุมัติแล้ว แยกระหว่างการวิ่งและการเดิน", "Approved results only, split between running and walking")}
          </p>
        </div>
        <Card>
          <PersonalDistanceChart data={distanceSeries} locale={locale} />
        </Card>
      </section>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label}>
            <p className="text-xs uppercase tracking-wider text-ink/40">{s.label}</p>
            <p className="mt-1 font-mono text-3xl font-bold tnum">{s.value}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
