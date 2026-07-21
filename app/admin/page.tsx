import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const db = createAdminClient();

  const [{ count: openEvents }, { count: pendingSubs }, { data: medalRegs }] =
    await Promise.all([
      db.from("events").select("id", { count: "exact", head: true }).eq("status", "open"),
      db
        .from("submissions")
        .select("id", { count: "exact", head: true })
        .in("status", ["pending", "flagged"]),
      db
        .from("registrations")
        .select("id, shipments(status), packages!inner(has_physical_medal)")
        .eq("status", "confirmed")
        .eq("packages.has_physical_medal", true),
    ]);

  type RegWithShipment = { shipments: { status: string } | { status: string }[] | null };
  const pendingShipments = ((medalRegs ?? []) as unknown as RegWithShipment[]).filter((r) => {
    const s = Array.isArray(r.shipments) ? r.shipments[0] : r.shipments;
    return !s || (s.status !== "shipped" && s.status !== "delivered");
  }).length;

  const stats = [
    { label: "งานที่เปิดรับสมัคร", value: openEvents ?? 0, href: "/admin/events" },
    { label: "ผลวิ่งรอตรวจ", value: pendingSubs ?? 0, href: "/admin/submissions" },
    { label: "ใบสมัครรอจัดส่งเหรียญ", value: pendingShipments, href: "/admin/shipments" },
  ];

  return (
    <section className="grid gap-4 sm:grid-cols-3">
      {stats.map((s) => (
        <Link key={s.href} href={s.href}>
          <Card className="hover:border-primary/40">
            <p className="text-xs uppercase tracking-wider text-ink/40">{s.label}</p>
            <p className="mt-1 font-mono text-4xl font-bold tnum">{s.value}</p>
          </Card>
        </Link>
      ))}
    </section>
  );
}
