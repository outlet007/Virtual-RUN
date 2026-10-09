import { redirect } from "next/navigation";
import { Gift, TriangleAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Badge, Card, HeadingIcon, LinkButton, Tabs } from "@/components/ui";
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
  allows_pickup: boolean;
  allows_shipping: boolean;
  reward_pickup_locations: {
    name: string;
    name_en: string | null;
    address: string;
    address_en: string | null;
    contact_phone: string | null;
    contact_phone_en: string | null;
    maps_url: string | null;
    instructions: string | null;
    instructions_en: string | null;
  } | null;
};
type RedemptionRow = {
  id: string;
  points_spent: number;
  status: "pending" | "fulfilled";
  fulfillment_method: 'pickup' | 'shipping';
  pickup_location_snapshot: Record<string, string> | null;
  shipping_address: Record<string, string> | null;
  rewards: { name: string; name_en: string | null } | null;
};

export default async function DashboardRewardsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; redeemed?: string; tab?: string }>;
}) {
  const sp = await searchParams;
  const [supabase, locale] = await Promise.all([createClient(), getLocale()]);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard/rewards");

  const [rewardsResult, ledgerResult, redemptionsResult, profileResult] = await Promise.all([
    supabase
      .from("rewards")
      .select('id, name, name_en, description, description_en, image_url, cost_points, stock, allows_pickup, allows_shipping, reward_pickup_locations(name, name_en, address, address_en, contact_phone, contact_phone_en, maps_url, instructions, instructions_en)')
      .order("cost_points", { ascending: true }),
    supabase.from("points_ledger").select("delta").eq("user_id", user.id),
    supabase
      .from("redemptions")
      .select('id, points_spent, status, fulfillment_method, pickup_location_snapshot, shipping_address, rewards(name, name_en)')
      .eq("user_id", user.id)
      .order("status", { ascending: false }),
    supabase.from('users').select('name, phone, address, province, postal_code').eq('id', user.id).single(),
  ]);

  if (rewardsResult.error) throw new Error(rewardsResult.error.message);
  if (ledgerResult.error) throw new Error(ledgerResult.error.message);
  if (redemptionsResult.error) throw new Error(redemptionsResult.error.message);

  const rewards = (rewardsResult.data ?? []) as unknown as RewardRow[];
  const balance = (ledgerResult.data ?? []).reduce((sum, row) => sum + row.delta, 0);
  const redemptions = (redemptionsResult.data ?? []) as unknown as RedemptionRow[];
  const profile = profileResult.data;
  const hasCompleteAddress = Boolean(
    profile?.address?.trim() && profile?.province?.trim() && profile?.postal_code?.trim(),
  );
  const defaultTab = sp.tab ?? (sp.redeemed ? "history" : "rewards");

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

      {!hasCompleteAddress && rewards.some((reward) => reward.allows_shipping) && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-medal-soft px-4 py-3 text-sm text-medal">
          <p className="flex items-center gap-2">
            <TriangleAlert className="size-4 shrink-0" aria-hidden="true" />
            {tx(
              locale,
              'กรอกข้อมูลที่อยู่ในหน้าโปรไฟล์ให้ครบ หากต้องการเลือกรับรางวัลด้วยการจัดส่ง',
              'Complete your profile address if you want rewards shipped to you.',
            )}
          </p>
          <LinkButton href="/profile" variant="ghost" className="shrink-0">
            {tx(locale, "ไปที่โปรไฟล์", "Go to profile")}
          </LinkButton>
        </div>
      )}
      {sp.error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{sp.error}</div>
      )}
      {sp.redeemed && (
        <div className="flex items-center gap-2 rounded-xl bg-primary-soft px-4 py-3 text-sm text-primary-dark">
          <Gift className="size-4 shrink-0" aria-hidden="true" />
          {tx(locale, "แลกรางวัลสำเร็จแล้ว รอผู้ดูแลระบบดำเนินการ", "Reward redeemed. An administrator will process it shortly.")}
        </div>
      )}

      <Tabs
        defaultTab={defaultTab}
        tabs={[
          {
            id: "history",
            label: `${tx(locale, "ประวัติการแลกรางวัล", "Redemption history")} (${redemptions.length})`,
            content: (
      <section className="space-y-4" aria-labelledby="redemption-history-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="redemption-history-heading" className="flex items-center gap-2 font-display text-xl font-bold">
            <HeadingIcon name="clipboard" />
            {tx(locale, "ประวัติการแลกรางวัล", "Redemption history")}
          </h2>
          <Badge className="bg-lane text-ink/60">{redemptions.length.toLocaleString(locale === "en" ? "en-US" : "th-TH")} {tx(locale, "รายการ", "items")}</Badge>
        </div>

        {redemptions.length === 0 ? (
          <Card className="py-10 text-center text-ink/50">{tx(locale, "ยังไม่มีประวัติการแลกรางวัล", "No redemption history yet")}</Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {redemptions.map((redemption) => (
              <Card key={redemption.id} className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="font-display font-bold">
                    {pickLocalized(locale, redemption.rewards?.name ?? tx(locale, "รางวัล", "Reward"), redemption.rewards?.name_en)}
                  </h3>
                  <Badge className={redemption.status === "pending" ? "bg-medal-soft text-medal" : "bg-[#12b76a] text-white"}>
                    {redemption.status === "pending" ? tx(locale, "รอดำเนินการ", "Processing") : tx(locale, "ส่งมอบแล้ว", "Fulfilled")}
                  </Badge>
                </div>
                <p className="text-sm text-ink/50">
                  <span className="font-mono font-semibold tnum">{redemption.points_spent.toLocaleString(locale === "en" ? "en-US" : "th-TH")}</span> {tx(locale, "แต้ม", "points")}
                </p>
                <div className='rounded-xl bg-lane/30 p-3 text-sm leading-6 text-ink/60'>
                  <p className='font-semibold text-ink'>
                    {redemption.fulfillment_method === 'pickup'
                      ? tx(locale, 'รับด้วยตนเอง', 'Pick up')
                      : tx(locale, 'จัดส่ง', 'Shipping')}
                  </p>
                  {redemption.fulfillment_method === 'pickup' ? (
                    <>
                      <p>{pickLocalized(locale, redemption.pickup_location_snapshot?.name ?? '', redemption.pickup_location_snapshot?.name_en)}</p>
                      <p>{pickLocalized(locale, redemption.pickup_location_snapshot?.address ?? '', redemption.pickup_location_snapshot?.address_en)}</p>
                      {(redemption.pickup_location_snapshot?.contact_phone || redemption.pickup_location_snapshot?.contact_phone_en) && (
                        <p>{pickLocalized(locale, redemption.pickup_location_snapshot?.contact_phone ?? '', redemption.pickup_location_snapshot?.contact_phone_en)}</p>
                      )}
                    </>
                  ) : (
                    <>
                      <p>{redemption.shipping_address?.recipient}</p>
                      <p>{redemption.shipping_address?.address}</p>
                      <p>{redemption.shipping_address?.province} {redemption.shipping_address?.postal_code}</p>
                    </>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
            ),
          },
          {
            id: "rewards",
            label: `${tx(locale, "แลกแต้มเป็นรางวัล", "Available rewards")} (${rewards.length})`,
            content: (

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
              const hasAvailableFulfillment = reward.allows_pickup || (reward.allows_shipping && hasCompleteAddress);
              const canRedeem = hasEnoughPoints && inStock && hasAvailableFulfillment;
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
                        <RewardRedeemButton
                          reward={{
                            ...reward,
                            name: pickLocalized(locale, reward.name, reward.name_en),
                            description: pickLocalized(locale, reward.description, reward.description_en),
                            pickup_location: reward.reward_pickup_locations,
                          }}
                          balance={balance}
                          locale={locale}
                          hasCompleteAddress={hasCompleteAddress}
                          shippingAddress={{
                            recipient: profile?.name ?? null,
                            phone: profile?.phone ?? null,
                            address: profile?.address ?? null,
                            province: profile?.province ?? null,
                            postal_code: profile?.postal_code ?? null,
                          }}
                        />
                      ) : !inStock ? (
                        <div className="rounded-xl bg-lane/60 px-3 py-3 text-center text-sm font-semibold text-ink/45">
                          {tx(locale, "รางวัลหมดแล้ว", "Reward is out of stock")}
                        </div>
                      ) : !hasEnoughPoints ? (
                        <div className="rounded-xl bg-lane/60 px-3 py-3 text-center text-sm font-semibold text-ink/45">
                          {tx(locale, "แต้มไม่เพียงพอ ขาดอีก", "Not enough points. You need") +
                            " " + missingPoints.toLocaleString(locale === "en" ? "en-US" : "th-TH") +
                            " " + tx(locale, "แต้ม", "more points")}
                        </div>
                      ) : !hasAvailableFulfillment ? (
                        <LinkButton href="/profile" variant="ghost" className="w-full">
                          {tx(locale, "กรอกที่อยู่เพื่อแลกรางวัล", "Complete your address to redeem")}
                        </LinkButton>
                      ) : (
                        <div />
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>
            ),
          },
        ]}
      />
    </div>
  );
}
