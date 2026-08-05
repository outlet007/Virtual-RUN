import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const { role } = await requireAdmin();
  if (role === "admin") redirect("/admin/events");
  if (role === "staff") redirect("/admin/submissions");

  const db = createAdminClient();

  const [
    { count: openEvents },
    { count: pendingSubs },
    { count: pendingPayments },
    { data: medalRegs },
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
  ] = await Promise.all([
    db.from("events").select("id", { count: "exact", head: true }).eq("status", "open"),
    db
      .from("submissions")
      .select("id", { count: "exact", head: true })
      .in("status", ["pending", "flagged"]),
    db.from("payments").select("id", { count: "exact", head: true }).eq("status", "pending"),
    db
      .from("registrations")
      .select("id, shipments(status), packages!inner(has_physical_medal)")
      .eq("status", "confirmed")
      .eq("packages.has_physical_medal", true),
    db.from("users").select("id", { count: "exact", head: true }).eq("role", "user"),
    db.from("events").select("id", { count: "exact", head: true }),
    db.from("registrations").select("id", { count: "exact", head: true }),
    db
      .from("registrations")
      .select("id", { count: "exact", head: true })
      .eq("status", "confirmed"),
    db
      .from("submissions")
      .select("id", { count: "exact", head: true })
      .eq("status", "approved"),
    db.from("submissions").select("distance_km").eq("status", "approved"),
    db.from("points_ledger").select("delta").gt("delta", 0),
    db.from("user_medals").select("id", { count: "exact", head: true }),
    db.from("redemptions").select("id", { count: "exact", head: true }),
    db.from("payments").select("amount").eq("status", "paid"),
  ]);

  type RegWithShipment = { shipments: { status: string } | { status: string }[] | null };
  const pendingShipments = ((medalRegs ?? []) as unknown as RegWithShipment[]).filter((r) => {
    const s = Array.isArray(r.shipments) ? r.shipments[0] : r.shipments;
    return !s || (s.status !== "shipped" && s.status !== "delivered");
  }).length;

  const totalDistanceKm = (distanceRows ?? []).reduce((sum, r) => sum + Number(r.distance_km), 0);
  const totalPointsAwarded = (pointsRows ?? []).reduce((sum, r) => sum + r.delta, 0);
  const totalRevenue = (paidPayments ?? []).reduce((sum, r) => sum + Number(r.amount), 0);

  const actionStats = [
    { label: "งานที่เปิดรับสมัคร", value: openEvents ?? 0, href: "/admin/events" },
    { label: "ผลวิ่งรอตรวจ", value: pendingSubs ?? 0, href: "/admin/submissions" },
    { label: "การชำระเงินรอตรวจสอบ", value: pendingPayments ?? 0, href: "/admin/payments" },
    { label: "ใบสมัครรอจัดส่งเหรียญ", value: pendingShipments, href: "/admin/shipments" },
  ];

  const overviewStats = [
    { label: "สมาชิกทั้งหมด", value: (totalMembers ?? 0).toLocaleString() },
    { label: "งานทั้งหมด", value: (totalEvents ?? 0).toLocaleString() },
    { label: "ผู้สมัครทั้งหมด", value: (totalRegistrations ?? 0).toLocaleString() },
    { label: "ใบสมัครยืนยันแล้ว", value: (confirmedRegistrations ?? 0).toLocaleString() },
    { label: "ผลวิ่งที่อนุมัติแล้ว", value: (approvedSubmissions ?? 0).toLocaleString() },
    { label: "ระยะสะสมทั้งระบบ (km)", value: totalDistanceKm.toLocaleString(undefined, { maximumFractionDigits: 1 }) },
    { label: "แต้มที่แจกไปแล้ว", value: totalPointsAwarded.toLocaleString() },
    { label: "เหรียญที่ปลดล็อกแล้ว", value: (medalsUnlocked ?? 0).toLocaleString() },
    { label: "รางวัลที่แลกแล้ว", value: (redemptionsCount ?? 0).toLocaleString() },
    { label: "ยอดชำระเงินสะสม (บาท)", value: totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 2 }) },
  ];

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 font-display text-lg font-bold">ต้องดำเนินการ</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {actionStats.map((s) => (
            <Link key={s.href} href={s.href}>
              <Card className="hover:border-primary/40">
                <p className="text-xs uppercase tracking-wider text-ink/40">{s.label}</p>
                <p className="mt-1 font-mono text-4xl font-bold tnum">{s.value}</p>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-display text-lg font-bold">ภาพรวมระบบ</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {overviewStats.map((s) => (
            <Card key={s.label}>
              <p className="text-xs uppercase tracking-wider text-ink/40">{s.label}</p>
              <p className="mt-1 font-mono text-2xl font-bold tnum">{s.value}</p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
