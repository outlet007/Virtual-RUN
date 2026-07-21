import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, Badge, LinkButton } from "@/components/ui";

export const dynamic = "force-dynamic";

const statusLabel: Record<string, string> = {
  draft: "ร่าง",
  open: "เปิดรับสมัคร",
  closed: "ปิดรับสมัคร",
};
const statusClass: Record<string, string> = {
  draft: "bg-lane text-ink/60",
  open: "bg-primary-soft text-primary-dark",
  closed: "bg-medal-soft text-medal",
};

export default async function AdminEventsPage() {
  const db = createAdminClient();
  const { data: events } = await db
    .from("events")
    .select("id, title, status, pricing, start_date, end_date, packages(id)")
    .order("start_date", { ascending: false });

  const list = events ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold">งานทั้งหมด</h2>
        <LinkButton href="/admin/events/new">+ สร้างงาน</LinkButton>
      </div>

      {list.length === 0 ? (
        <Card className="text-center text-ink/50">ยังไม่มีงาน</Card>
      ) : (
        <div className="space-y-3">
          {list.map((ev) => (
            <Link key={ev.id} href={`/admin/events/${ev.id}`}>
              <Card className="flex items-center justify-between hover:border-primary/40">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-display font-bold">{ev.title}</span>
                    <Badge className={statusClass[ev.status]}>
                      {statusLabel[ev.status]}
                    </Badge>
                  </div>
                  <p className="mt-1 font-mono text-xs text-ink/45 tnum">
                    {ev.start_date} → {ev.end_date} · {ev.packages.length} แพ็กเกจ
                  </p>
                </div>
                <span className="text-sm text-primary-dark">แก้ไข →</span>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
