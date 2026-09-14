import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { calculateLevelProgress, type LevelDefinition } from "@/lib/levels";
import { getLocale } from "@/lib/i18n/server";
import { pickLocalized } from "@/lib/i18n/shared";

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
  const [supabase, locale] = await Promise.all([createClient(), getLocale()]);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // user social login ครั้งแรกยังไม่เคยยอมรับ PDPA (ข้ามฟอร์มสมัครสมาชิกที่มี checkbox มา)
  const { data: privacyConsent, error: consentError } = await supabase
    .from("consents")
    .select("id")
    .eq("user_id", user.id)
    .eq("type", "privacy")
    .limit(1)
    .maybeSingle();
  if (consentError) {
    console.error("Consent lookup failed in dashboard", {
      code: consentError.code,
      message: consentError.message,
    });
    redirect(
      "/consent?error=" +
        encodeURIComponent("ตรวจสอบข้อมูลการยินยอมไม่สำเร็จ กรุณาลองอีกครั้ง"),
    );
  }
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
  // Level/XP ต้องอิงคะแนนสะสมทั้งหมดที่เคยได้รับ ไม่ใช่ยอดคงเหลือสุทธิ — แถวติดลบตอนแลกรางวัล
  // (ดู 0007_redeem_reward_function.sql) ไม่ควรทำให้ level ตกหรือ XP ถอยหลัง
  const points = (ledger ?? []).reduce((sum, l) => sum + Math.max(0, l.delta), 0);

  const { data: levelsRaw } = await supabase
    .from("levels")
    .select("level_number, name, name_en, min_xp")
    .order("level_number");
  const levels = ((levelsRaw ?? []) as LevelDefinition[]).map((level) => ({
    ...level,
    name: pickLocalized(locale, level.name, level.name_en),
  }));

  const { data: rankRows } = await supabase.rpc("get_my_rank_summary");
  const rankSummary = ((rankRows ?? [])[0] as RankSummary | undefined) ?? null;

  return (
    <div className="flex flex-col gap-8 lg:flex-row">
      <DashboardSidebar
        name={profile?.name ?? user.email ?? "—"}
        avatarUrl={profile?.avatar_url ?? null}
        levelProgress={calculateLevelProgress(points, levels)}
        rankSummary={rankSummary}
        locale={locale}
      />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
