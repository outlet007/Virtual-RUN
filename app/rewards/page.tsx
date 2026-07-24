import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, Badge, Button } from "@/components/ui";
import { redeemReward } from "@/lib/actions/rewards";

export const dynamic = "force-dynamic";

type RewardRow = {
  id: string;
  name: string;
  cost_points: number;
  stock: number;
};

export default async function RewardsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; redeemed?: string }>;
}) {
  const { error, redeemed } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/rewards");

  const { data: rewardsRaw } = await supabase
    .from("rewards")
    .select("id, name, cost_points, stock")
    .order("cost_points", { ascending: true });
  const rewards = (rewardsRaw ?? []) as RewardRow[];

  const { data: ledger } = await supabase.from("points_ledger").select("delta");
  const balance = (ledger ?? []).reduce((sum, l) => sum + l.delta, 0);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Link href="/dashboard" className="text-sm text-ink/50 hover:text-ink">
        ← แดชบอร์ด
      </Link>

      <Card className="bg-ink text-paper">
        <p className="text-xs uppercase tracking-wider text-paper/50">แต้มสะสมของฉัน</p>
        <p className="mt-1 font-mono text-4xl font-bold text-primary tnum">{balance}</p>
      </Card>

      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      {redeemed && (
        <div className="rounded-xl bg-primary-soft px-4 py-3 text-sm text-primary-dark">
          🎁 แลกรางวัลสำเร็จ — รอผู้จัดติดต่อกลับ
        </div>
      )}

      <h1 className="font-display text-xl font-bold">แลกแต้มเป็นรางวัล</h1>

      {rewards.length === 0 ? (
        <Card className="text-center text-ink/50">ยังไม่มีรางวัลให้แลก</Card>
      ) : (
        <div className="space-y-3">
          {rewards.map((r) => {
            const canRedeem = balance >= r.cost_points && r.stock > 0;
            return (
              <Card key={r.id} className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{r.name}</p>
                  <p className="font-mono text-sm text-ink/50 tnum">{r.cost_points} แต้ม</p>
                  <Badge
                    className={
                      r.stock > 0 ? "mt-1 bg-primary-soft text-primary-dark" : "mt-1 bg-lane text-muted"
                    }
                  >
                    {r.stock > 0 ? `คงเหลือ ${r.stock}` : "หมดแล้ว"}
                  </Badge>
                </div>
                <form action={redeemReward}>
                  <input type="hidden" name="reward_id" value={r.id} />
                  <Button type="submit" disabled={!canRedeem}>
                    แลก
                  </Button>
                </form>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
