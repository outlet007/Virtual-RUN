import { redirect } from "next/navigation";
import { Gift } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, Badge, Button, LinkButton } from "@/components/ui";
import { redeemReward } from "@/lib/actions/rewards";

export const dynamic = "force-dynamic";

type RewardRow = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
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
    .select("id, name, description, image_url, cost_points, stock")
    .order("cost_points", { ascending: true });
  const rewards = (rewardsRaw ?? []) as RewardRow[];

  const { data: ledger } = await supabase.from("points_ledger").select("delta");
  const balance = (ledger ?? []).reduce((sum, l) => sum + l.delta, 0);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <LinkButton href="/dashboard" variant="ghost" icon="back">
        แดชบอร์ด
      </LinkButton>

      <Card className="bg-ink text-paper">
        <p className="text-xs uppercase tracking-wider text-paper">แต้มสะสมของฉัน</p>
        <p className="mt-1 font-mono text-4xl font-bold text-primary tnum">{balance}</p>
      </Card>

      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      {redeemed && (
        <div className="flex items-center gap-2 rounded-xl bg-primary-soft px-4 py-3 text-sm text-primary-dark">
          <Gift className="h-4 w-4 shrink-0" /> แลกรางวัลสำเร็จ — รอผู้จัดติดต่อกลับ
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
              <Card key={r.id} className="space-y-4">
                <div className="flex items-start gap-4">
                  {r.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={r.image_url}
                      alt={r.name}
                      className="h-24 w-24 shrink-0 rounded-xl border border-lane object-cover"
                    />
                  ) : (
                    <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl border border-dashed border-lane bg-lane/30 text-ink/35">
                      <Gift className="h-8 w-8" aria-hidden="true" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{r.name}</p>
                    <p className="font-mono text-sm text-ink/50 tnum">{r.cost_points} แต้ม</p>
                    {r.description && (
                      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-ink/65">
                        {r.description}
                      </p>
                    )}
                    <Badge
                      className={
                        r.stock > 0 ? "mt-2 bg-primary-soft text-primary-dark" : "mt-2 bg-lane text-muted"
                      }
                    >
                      {r.stock > 0 ? `คงเหลือ ${r.stock}` : "หมดแล้ว"}
                    </Badge>
                  </div>
                </div>
                <form action={redeemReward} className="flex justify-end">
                  <input type="hidden" name="reward_id" value={r.id} />
                  <Button type="submit" disabled={!canRedeem} icon="gift">
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
