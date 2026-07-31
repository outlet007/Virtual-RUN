import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { getLevelProgress } from "@/lib/utils";

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

  const { data: ledger } = await supabase.from("points_ledger").select("delta");
  const points = (ledger ?? []).reduce((sum, l) => sum + l.delta, 0);

  return (
    <div className="flex flex-col gap-8 lg:flex-row">
      <DashboardSidebar
        name={profile?.name ?? user.email ?? "—"}
        avatarUrl={profile?.avatar_url ?? null}
        levelProgress={getLevelProgress(points)}
      />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
