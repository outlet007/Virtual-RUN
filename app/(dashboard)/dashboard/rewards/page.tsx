import { redirect } from "next/navigation";
import { Gift } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Badge, Card } from "@/components/ui";
import { RewardRedeemButton } from "@/components/dashboard/reward-redeem-button";

export const dynamic = "force-dynamic";

type RewardRow = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  cost_points: number;
  stock: number;
};

export default async function DashboardRewardsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; redeemed?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard/rewards");

  const [{ data: rewardsRaw }, { data: ledger }] = await Promise.all([
    supabase
      .from("rewards")
      .select("id, name, description, image_url, cost_points, stock")
      .order("cost_points", { ascending: true }),
    supabase.from("points_ledger").select("delta").eq("user_id", user.id),
  ]);

  const rewards = (rewardsRaw ?? []) as RewardRow[];
  const balance = (ledger ?? []).reduce((sum, row) => sum + row.delta, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">แลกแต้มเป็นรางวัล</h1>
        <p className="mt-1 text-sm text-muted">
          เลือกรางวัลที่ต้องการและยืนยันก่อนใช้แต้มสะสม
        </p>
      </div>

      <Card className="bg-ink text-paper">
        <p className="text-xs uppercase tracking-wider text-paper">แต้มสะสมของฉัน</p>
        <p className="mt-1 font-mono text-4xl font-bold text-[#F5A524] tnum">
          {balance.toLocaleString("th-TH")}
        </p>
      </Card>

      {sp.error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{sp.error}</div>
      )}
      {sp.redeemed && (
        <div className="flex items-center gap-2 rounded-xl bg-primary-soft px-4 py-3 text-sm text-primary-dark">
          <Gift className="size-4 shrink-0" aria-hidden="true" />
          แลกรางวัลสำเร็จแล้ว รอผู้ดูแลระบบดำเนินการ
        </div>
      )}

      <section className="space-y-4">
        <div>
          <h2 className="font-display text-xl font-bold">แลกแต้มเป็นรางวัล</h2>
          <p className="mt-1 text-sm text-ink/50">
            รางวัลที่แต้มถึงและยังมีของคงเหลือจะแสดงปุ่มแลก
          </p>
        </div>

        {rewards.length === 0 ? (
          <Card className="py-10 text-center text-ink/50">ยังไม่มีรางวัลในระบบ</Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {rewards.map((reward) => {
              const hasEnoughPoints = balance >= reward.cost_points;
              const inStock = reward.stock > 0;
              const canRedeem = hasEnoughPoints && inStock;
              const missingPoints = Math.max(0, reward.cost_points - balance);

              return (
                <Card
                  key={reward.id}
                  className={
                    canRedeem
                      ? "flex h-full flex-col overflow-hidden p-0 transition hover:border-primary/50 sm:p-0"
                      : "flex h-full flex-col overflow-hidden bg-lane/20 p-0 sm:p-0"
                  }
                >
                  <div className="aspect-[4/3] overflow-hidden border-b border-lane bg-lane/25">
                    {reward.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={reward.image_url}
                        alt={reward.name}
                        className={
                          canRedeem
                            ? "h-full w-full object-cover"
                            : "h-full w-full object-cover grayscale opacity-60"
                        }
                      />
                    ) : (
                      <div
                        className={
                          canRedeem
                            ? "grid h-full place-items-center text-ink/30"
                            : "grid h-full place-items-center text-ink/20 grayscale"
                        }
                      >
                        <Gift className="size-12" aria-hidden="true" />
                      </div>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col p-4 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h3 className="font-display text-lg font-bold">{reward.name}</h3>
                      <Badge
                        className={
                          inStock
                            ? "bg-primary-soft text-primary-dark"
                            : "bg-red-100 text-red-700"
                        }
                      >
                        {inStock
                          ? "คงเหลือ " + reward.stock.toLocaleString("th-TH")
                          : "หมดแล้ว"}
                      </Badge>
                    </div>

                    <p className="mt-2 font-mono text-lg font-bold text-[#F5A524] tnum">
                      {reward.cost_points.toLocaleString("th-TH")} แต้ม
                    </p>

                    {reward.description && (
                      <p className="mt-3 line-clamp-3 whitespace-pre-line text-sm leading-6 text-ink/60">
                        {reward.description}
                      </p>
                    )}

                    <div className="mt-auto pt-5">
                      {canRedeem ? (
                        <RewardRedeemButton reward={reward} balance={balance} />
                      ) : (
                        <div className="rounded-xl bg-lane/60 px-3 py-3 text-center text-sm font-semibold text-ink/45">
                          {!inStock
                            ? "รางวัลหมดแล้ว"
                            : "แต้มไม่เพียงพอ ขาดอีก " +
                              missingPoints.toLocaleString("th-TH") +
                              " แต้ม"}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
