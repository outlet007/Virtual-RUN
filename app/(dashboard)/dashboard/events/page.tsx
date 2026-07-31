import Link from "next/link";
import { redirect } from "next/navigation";
import { Flag } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, Badge, LinkButton, TrackProgress } from "@/components/ui";
import { formatKm } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Reg = {
  id: string;
  bib_number: string | null;
  status: string;
  packages: { name: string; target_distance_km: number; has_physical_medal: boolean } | null;
  events: { title: string } | null;
};
type Sub = {
  registration_id: string;
  distance_km: number;
  status: string;
};

export default async function MyEventsPage() {
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
    .select("registration_id, distance_km, status")
    .eq("user_id", user.id);

  const regs = (regsRaw ?? []) as unknown as Reg[];
  const subs = (subsRaw ?? []) as Sub[];

  const approvedByReg = new Map<string, number>();
  for (const s of subs) {
    if (s.status === "approved") {
      approvedByReg.set(
        s.registration_id,
        (approvedByReg.get(s.registration_id) ?? 0) + Number(s.distance_km),
      );
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold">งานของฉัน</h2>
          <p className="mt-1 text-sm text-muted">งานที่สมัครไว้ทั้งหมด พร้อมความคืบหน้าสะสมระยะ</p>
        </div>
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
                    <p className="font-display text-lg font-bold">{r.packages?.name}</p>
                  </div>
                  <div className="text-right">
                    {r.bib_number && (
                      <p className="font-mono text-sm text-muted tnum">BIB {r.bib_number}</p>
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
                          finished ? "bg-primary-soft text-primary-dark" : "bg-lane text-muted"
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
                    <span className="font-bold text-primary-dark">{formatKm(done)} km</span>
                    <span className="text-ink/40">/ {target} km</span>
                  </div>
                  <TrackProgress current={done} target={target} />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
