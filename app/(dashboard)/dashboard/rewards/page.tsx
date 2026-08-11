import { redirect } from "next/navigation";
import { Gift } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Badge, Card, HeadingIcon } from "@/components/ui";
import { RewardRedeemButton } from "@/components/dashboard/reward-redeem-button";
import { getLocale } from "@/lib/i18n/server";
import { pickLocalized, tx } from "@/lib/i18n/shared";

export const dynamic = "force-dynamic";

type RewardRow = {
  id: string;
  name: string;
  name_en: string | null;
  description: string | null;
  description_en: string | null;
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
  const [supabase, locale] = await Promise.all([createClient(), getLocale()]);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard/rewards");

  const [{ data: rewardsRaw }, { data: ledger }] = await Promise.all([
    supabase
      .from("rewards")
      .select("id, name, name_en, description, description_en, image_url, cost_points, stock")
      .order("cost_points", { ascending: true }),
    supabase.from("points_ledger").select("delta").eq("user_id", user.id),
  ]);

  const rewards = (rewardsRaw ?? []) as RewardRow[];
  const balance = (ledger ?? []).reduce((sum, row) => sum + row.delta, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold">
          <HeadingIcon name="gift" />
          {tx(locale, "แลกแต้มเป็นรางวัล", "Redeem rewards")}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {tx(locale, "เลือกรางวัลที่ต้องการและยืนยันก่อนใช้แต้มสะสม", "Choose a reward and confirm before spending points")}
        </p>
      </div>

      <Card className="bg-ink text-paper">
        <p className="text-xs uppercase tracking-wider text-paper">{tx(locale, "แต้มสะสมของฉัน", "My points")}</p>
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
          {tx(locale, "แลกรางวัลสำเร็จแล้ว รอผู้ดูแลระบบดำเนินการ", "Reward redeemed. An administrator will process it shortly.")}
        </div>
      )}

      <section className="space-y-4">
        <div>
          <h2 className="flex items-center gap-2 font-display text-xl font-bold">
            <HeadingIcon name="gift" />
            {tx(locale, "แลกแต้มเป็นรางวัล", "Available rewards")}
          </h2>
          <p className="mt-1 text-sm text-ink/50">
            {tx(locale, "รางวัลที่แต้มถึงและยังมีของคงเหลือจะแสดงปุ่มแลก", "Rewards you can afford and that are in stock can be redeemed")}
          </p>
        </div>

        {rewards.length === 0 ? (
          <Card className="py-10 text-center text-ink/50">{tx(locale, "ยังไม่มีรางวัลในระบบ", "No rewards available")}</Card>
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
                        alt={pickLocalized(locale, reward.name, reward.name_en)}
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
                      <h3 className="flex items-center gap-2 font-display text-lg font-bold">
                        <HeadingIcon name="gift" className="size-4" />
                        {pickLocalized(locale, reward.name, reward.name_en)}
                      </h3>
                      <Badge
                        className={
                          inStock
                            ? "bg-primary-soft text-primary-dark"
                            : "bg-red-100 text-red-700"
                        }
                      >
                        {inStock
                          ? tx(locale, "คงเหลือ", "In stock") + " " + reward.stock.toLocaleString(locale === "en" ? "en-US" : "th-TH")
                          : tx(locale, "หมดแล้ว", "Out of stock")}
                      </Badge>
                    </div>

                    <p className="mt-2 font-mono text-lg font-bold text-[#F5A524] tnum">
                      {reward.cost_points.toLocaleString(locale === "en" ? "en-US" : "th-TH")} {tx(locale, "แต้ม", "points")}
                    </p>

                    {pickLocalized(locale, reward.description, reward.description_en) && (
                      <p className="mt-3 line-clamp-3 whitespace-pre-line text-sm leading-6 text-ink/60">
                        {pickLocalized(locale, reward.description, reward.description_en)}
                      </p>
                    )}

                    <div className="mt-auto pt-5">
                      {canRedeem ? (
                        <RewardRedeemButton reward={{ ...reward, name: pickLocalized(locale, reward.name, reward.name_en), description: pickLocalized(locale, reward.description, reward.description_en) }} balance={balance} locale={locale} />
                      ) : (
                        <div className="rounded-xl bg-lane/60 px-3 py-3 text-center text-sm font-semibold text-ink/45">
                          {!inStock
                            ? tx(locale, "รางวัลหมดแล้ว", "Reward is out of stock")
                            : tx(locale, "แต้มไม่เพียงพอ ขาดอีก", "Not enough points. You need") +
                              " " + missingPoints.toLocaleString(locale === "en" ? "en-US" : "th-TH") +
                              " " + tx(locale, "แต้ม", "more points")}
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
