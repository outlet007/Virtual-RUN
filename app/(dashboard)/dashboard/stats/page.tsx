import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui";
import { formatKm } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Sub = {
  distance_km: number;
  status: string;
  activity_type: string;
};

export default async function StatsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: subsRaw } = await supabase
    .from("submissions")
    .select("distance_km, status, activity_type")
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

  const stats = [
    { label: "ระยะสะสมรวม", value: `${formatKm(totalKm)} km` },
    { label: "ระยะวิ่งสะสม", value: `${formatKm(runKm)} km` },
    { label: "ระยะเดินสะสม", value: `${formatKm(walkKm)} km` },
    { label: "แต้มสะสม", value: points },
    { label: "เหรียญที่ได้รับ", value: medalsCount ?? 0 },
    { label: "งานที่สมัคร", value: regs.length },
    { label: "งานที่ยืนยันแล้ว", value: regs.filter((r) => r.status === "confirmed").length },
    { label: "ผลวิ่งที่บันทึกทั้งหมด", value: subs.length },
    { label: "ผลวิ่งที่อนุมัติแล้ว", value: approved.length },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold">สถิติของฉัน</h2>
        <p className="mt-1 text-sm text-muted">ภาพรวมผลงานสะสมทั้งหมดของบัญชีนี้</p>
      </div>
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
