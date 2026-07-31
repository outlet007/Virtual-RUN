import { redirect } from "next/navigation";
import { Footprints, PersonStanding } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, Badge } from "@/components/ui";
import { formatKm } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Sub = {
  id: string;
  distance_km: number;
  status: string;
  activity_type: string;
  activity_date: string;
  source: string;
  registrations: { events: { title: string } | null } | null;
};

export default async function HistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: subsRaw } = await supabase
    .from("submissions")
    .select(
      "id, distance_km, status, activity_type, activity_date, source, registrations(events(title))",
    )
    .eq("user_id", user.id)
    .order("activity_date", { ascending: false });

  const subs = (subsRaw ?? []) as unknown as Sub[];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold">ประวัติการเข้าร่วม</h2>
        <p className="mt-1 text-sm text-muted">ผลวิ่งที่บันทึกไว้ทั้งหมด (อัปโหลดเองและซิงก์จาก Strava)</p>
      </div>

      {subs.length === 0 ? (
        <Card className="text-center text-ink/50">ยังไม่มีประวัติผลวิ่ง</Card>
      ) : (
        <Card className="divide-y divide-lane p-0">
          {subs.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-4 px-5 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="shrink-0 text-ink/60">
                  {s.activity_type === "walk" ? (
                    <PersonStanding className="h-5 w-5" />
                  ) : (
                    <Footprints className="h-5 w-5" />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm">{s.registrations?.events?.title ?? "—"}</p>
                  <p className="font-mono text-xs text-ink/40 tnum">
                    {formatKm(Number(s.distance_km))} km ·{" "}
                    {new Date(s.activity_date).toLocaleDateString("th-TH")} ·{" "}
                    {s.source === "strava" ? "Strava" : "อัปโหลดเอง"}
                  </p>
                </div>
              </div>
              <Badge
                className={
                  s.status === "approved"
                    ? "shrink-0 bg-primary-soft text-primary-dark"
                    : s.status === "rejected"
                      ? "shrink-0 bg-red-50 text-red-600"
                      : "shrink-0 bg-medal-soft text-medal"
                }
              >
                {s.status === "approved" ? "อนุมัติ" : s.status === "rejected" ? "ปฏิเสธ" : "รอตรวจ"}
              </Badge>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
