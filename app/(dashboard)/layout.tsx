import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { calculateLevelProgress, type LevelDefinition } from "@/lib/levels";

type RankSummary = {
  total_users: number;
  points: number;
  points_rank: number;
  distance_km: number;
  distance_rank: number;
  approved_runs: number;
  approved_runs_rank: number;
};

export default async function UserDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // user social login ครั้งแรกยังไม่เคยยอมรับ PDPA (ข้ามฟอร์มสมัครสมาชิกที่มี checkbox มา)
  const { data: privacyConsent } = await supabase
    .from("consents")
    .select("id")
    .eq("user_id", user.id)
    .eq("type", "privacy")
    .maybeSingle();
  if (!privacyConsent) redirect("/consent");

  const { data: profile } = await supabase
    .from("users")
    .select("name, avatar_url")
    .eq("id", user.id)
    .single();

  const { data: ledger } = await supabase
    .from("points_ledger")
    .select("delta")
    .eq("user_id", user.id);
  const points = (ledger ?? []).reduce((sum, l) => sum + l.delta, 0);

  const { data: levelsRaw } = await supabase
    .from("levels")
    .select("level_number, name, min_xp")
    .order("level_number");
  const levels = (levelsRaw ?? []) as LevelDefinition[];

  const { data: rankRows } = await supabase.rpc("get_my_rank_summary");
  const rankSummary = ((rankRows ?? [])[0] as RankSummary | undefined) ?? null;

  return (
    <div className="flex flex-col gap-8 lg:flex-row">
      <DashboardSidebar
        name={profile?.name ?? user.email ?? "—"}
        avatarUrl={profile?.avatar_url ?? null}
        levelProgress={calculateLevelProgress(points, levels)}
        rankSummary={rankSummary}
      />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
