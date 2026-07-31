import { redirect } from "next/navigation";
import { Medal as MedalIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { MedalFilterGrid } from "@/components/dashboard/medal-filter-grid";
import type { MedalEntry } from "@/components/dashboard/medal-hexagon";

export const dynamic = "force-dynamic";

type MedalRow = {
  id: string;
  name: string;
  tier: string;
  image_url: string | null;
  unlock_rule: { target_km?: number } | null;
};
type RegRow = {
  id: string;
  events: { title: string; medals: MedalRow[] } | null;
};
type Sub = {
  registration_id: string;
  distance_km: number;
  status: string;
};

export default async function MedalsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // เหรียญผูกกับ event ที่สมัครไว้เท่านั้น (ต้องมี registration ถึงจะเริ่มสะสมระยะเทียบกับเหรียญของงานนั้นได้)
  const { data: regsRaw } = await supabase
    .from("registrations")
    .select("id, events(title, medals(id, name, tier, image_url, unlock_rule))")
    .eq("user_id", user.id)
    .eq("status", "confirmed");

  const { data: subsRaw } = await supabase
    .from("submissions")
    .select("registration_id, distance_km, status")
    .eq("user_id", user.id);

  const { data: earnedRaw } = await supabase
    .from("user_medals")
    .select("medal_id, unlocked_at")
    .eq("user_id", user.id);

  const regs = (regsRaw ?? []) as unknown as RegRow[];
  const subs = (subsRaw ?? []) as Sub[];
  const earnedMap = new Map((earnedRaw ?? []).map((e) => [e.medal_id, e.unlocked_at]));

  const approvedByReg = new Map<string, number>();
  for (const s of subs) {
    if (s.status === "approved") {
      approvedByReg.set(
        s.registration_id,
        (approvedByReg.get(s.registration_id) ?? 0) + Number(s.distance_km),
      );
    }
  }

  const entries: MedalEntry[] = regs.flatMap((r) =>
    (r.events?.medals ?? []).map((m) => ({
      key: `${r.id}-${m.id}`,
      name: m.name,
      tier: m.tier,
      imageUrl: m.image_url,
      earned: earnedMap.has(m.id),
      unlockedAt: earnedMap.get(m.id) ?? null,
      progressKm: approvedByReg.get(r.id) ?? 0,
      targetKm: m.unlock_rule?.target_km ?? 0,
      eventTitle: r.events?.title ?? "",
    })),
  );

  const earnedCount = entries.filter((e) => e.earned).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold">เหรียญรางวัลของฉัน</h2>
          <p className="mt-1 text-sm text-muted">เก็บเหรียญให้ครบทุกความสำเร็จในเส้นทางนักวิ่งของคุณ</p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-lane bg-white px-5 py-3">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-medal-soft text-medal">
            <MedalIcon className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs text-ink/40">เหรียญที่ได้รับ</p>
            <p className="font-mono text-lg font-bold tnum">
              {earnedCount} / {entries.length}
            </p>
          </div>
        </div>
      </div>

      {entries.length === 0 ? (
        <p className="text-center text-sm text-ink/40">
          ยังไม่มีเหรียญให้สะสม — สมัครงานที่มีเหรียญดิจิทัลก่อนเริ่มสะสมได้เลย
        </p>
      ) : (
        <MedalFilterGrid entries={entries} />
      )}
    </div>
  );
}
