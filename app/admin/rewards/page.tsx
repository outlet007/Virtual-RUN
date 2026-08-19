import Link from "next/link";
import { Gift, RotateCcw, Search } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge, Button, Card, HeadingIcon, Input, Label, LinkButton, Tabs } from "@/components/ui";
import { CreateRewardModal } from "@/components/admin/create-reward-modal";
import { EditRewardModal } from "@/components/admin/edit-reward-modal";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { deleteReward, fulfillRedemption } from "@/lib/actions/admin";

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

type RedemptionRow = {
  id: string;
  points_spent: number;
  status: string;
  users: { name: string | null; email: string | null } | null;
  rewards: { name: string } | null;
};

export default async function AdminRewardsPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    tab?: string;
    create?: string;
    edit?: string;
    q?: string;
    reward_added?: string;
    reward_saved?: string;
    reward_deleted?: string;
    fulfilled?: string;
  }>;
}) {
  const sp = await searchParams;
  const db = createAdminClient();

  const [rewardsResult, redemptionsResult] = await Promise.all([
    db.from("rewards").select("id, name, name_en, description, description_en, image_url, cost_points, stock").order("cost_points"),
    db
      .from("redemptions")
      .select("id, points_spent, status, users(name, email), rewards(name)")
      .order("status", { ascending: false }),
  ]);

  if (rewardsResult.error) throw new Error(rewardsResult.error.message);
  if (redemptionsResult.error) throw new Error(redemptionsResult.error.message);

  const rewards = (rewardsResult.data ?? []) as RewardRow[];
  const redemptions = (redemptionsResult.data ?? []) as unknown as RedemptionRow[];
  const pendingRedemptions = redemptions.filter((redemption) => redemption.status === "pending");
  const fulfilledRedemptions = redemptions.filter((redemption) => redemption.status === "fulfilled");
  const defaultTab =
    sp.tab ??
    (sp.create === "1" || sp.edit || sp.reward_added || sp.reward_saved || sp.reward_deleted
      ? "catalog"
      : "redemptions");

  const q = (sp.q ?? "").trim();
  const searchNeedle = q.toLocaleLowerCase("th-TH");
  const filteredRewards = searchNeedle
    ? rewards.filter((rw) =>
        [rw.name, rw.name_en].some((value) => (value ?? "").toLocaleLowerCase("th-TH").includes(searchNeedle)),
      )
    : rewards;

  const editReward = sp.edit ? rewards.find((rw) => rw.id === sp.edit) : undefined;

  return (
    <div className="space-y-8">
      {sp.error && sp.create !== "1" && !sp.edit && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{sp.error}</div>
      )}
      {(sp.reward_added || sp.reward_saved || sp.reward_deleted || sp.fulfilled) && (
        <div className="rounded-xl bg-primary-soft px-4 py-3 text-sm text-primary-dark">
          {sp.reward_deleted ? "ลบรางวัลแล้ว" : "บันทึกแล้ว"}
        </div>
      )}

      <Tabs
        defaultTab={defaultTab}
        tabs={[
          {
            id: "redemptions",
            label: `รายการแลกรางวัล (${redemptions.length})`,
            content: (
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-display text-xl font-bold">
            <HeadingIcon name="clipboard" />
            รายการแลกรางวัลทั้งหมด
          </h2>
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-medal-soft text-medal">รอดำเนินการ {pendingRedemptions.length}</Badge>
            <Badge className="bg-primary-soft text-primary-dark">ส่งมอบแล้ว {fulfilledRedemptions.length}</Badge>
          </div>
        </div>
        {redemptions.length === 0 ? (
          <Card className="mt-3 text-center text-ink/50">ยังไม่มีประวัติการแลกรางวัล</Card>
        ) : (
          <div className="mt-3 space-y-3">
            {redemptions.map((r) => (
              <Card key={r.id} className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{r.users?.name || r.users?.email || "ไม่ทราบชื่อ"}</p>
                    <Badge className={r.status === "pending" ? "bg-medal-soft text-medal" : "bg-primary-soft text-primary-dark"}>
                      {r.status === "pending" ? "รอดำเนินการ" : "ส่งมอบแล้ว"}
                    </Badge>
                  </div>
                  <p className="text-sm text-ink/50">
                    {r.rewards?.name} · <span className="font-mono tnum">{r.points_spent}</span> แต้ม
                  </p>
                </div>
                {r.status === "pending" && (
                  <form action={fulfillRedemption}>
                    <input type="hidden" name="id" value={r.id} />
                    <Button type="submit" icon="success">ส่งมอบแล้ว</Button>
                  </form>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
            ),
          },
          {
            id: "catalog",
            label: `แคตตาล็อกรางวัล (${rewards.length})`,
            content: (

      <div className="space-y-4">
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="flex items-center gap-2 font-display text-xl font-bold">
            <HeadingIcon name="gift" />
            แคตตาล็อกรางวัล
          </h2>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <span className="font-mono text-sm text-ink/45 tnum">
              {filteredRewards.length} รางวัล
            </span>
            <CreateRewardModal initialOpen={sp.create === "1"} error={!sp.edit ? sp.error : undefined} />
          </div>
        </div>

        <Card>
          <form method="get" className="space-y-4">
            <input type="hidden" name="tab" value="catalog" />
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <div>
                <Label htmlFor="reward-search">ค้นหารางวัล</Label>
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40"
                    aria-hidden="true"
                  />
                  <Input
                    id="reward-search"
                    name="q"
                    defaultValue={q}
                    placeholder="ชื่อรางวัล (ไทยหรืออังกฤษ)"
                    className="pl-9"
                  />
                </div>
              </div>
              <Button type="submit" className="w-full sm:w-auto" icon="search">
                ค้นหา
              </Button>
            </div>
            {q && (
              <Link
                href="/admin/rewards?tab=catalog"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-lane px-4 text-sm font-semibold transition hover:bg-lane/50"
              >
                <RotateCcw className="size-4" aria-hidden="true" />
                ล้างการค้นหา
              </Link>
            )}
          </form>
        </Card>

        {filteredRewards.length === 0 ? (
          <Card className="text-center text-ink/50">
            {q ? "ไม่พบรางวัลที่ตรงกับเงื่อนไข" : "ยังไม่มีรางวัลในแคตตาล็อก"}
          </Card>
        ) : (
          <Card className="overflow-hidden p-0 sm:p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <caption className="sr-only">แคตตาล็อกรางวัลทั้งหมด</caption>
                <thead className="bg-lane/35 text-xs text-ink/55">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-semibold">รางวัล</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">แต้มที่ใช้แลก</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">จำนวนคงเหลือ</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-lane">
                  {filteredRewards.map((rw) => (
                    <tr key={rw.id} className="align-top transition hover:bg-lane/20">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          {rw.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={rw.image_url}
                              alt=""
                              className="size-10 shrink-0 rounded-lg border border-lane object-cover"
                            />
                          ) : (
                            <span
                              className="grid size-10 shrink-0 place-items-center rounded-lg bg-lane text-ink/30"
                              aria-hidden="true"
                            >
                              <Gift className="size-4" />
                            </span>
                          )}
                          <div className="min-w-0">
                            <p className="font-semibold text-ink">{rw.name}</p>
                            {rw.name_en && (
                              <p className="mt-0.5 truncate text-xs text-ink/45">{rw.name_en}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right font-mono tnum">
                        {rw.cost_points.toLocaleString("th-TH")}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Badge className={rw.stock > 0 ? "bg-primary-soft text-primary-dark" : "bg-lane text-muted"}>
                          คงเหลือ {rw.stock}
                        </Badge>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <LinkButton
                            href={`/admin/rewards?tab=catalog&edit=${rw.id}`}
                            variant="ghost"
                            icon="edit"
                            className="min-h-9 px-3 py-1"
                          >
                            แก้ไข
                          </LinkButton>
                          <form action={deleteReward}>
                            <input type="hidden" name="id" value={rw.id} />
                            <ConfirmDeleteButton
                              formAction={deleteReward}
                              triggerLabel="ลบ"
                              title="ยืนยันการลบรางวัล"
                              description={`ต้องการลบรางวัล "${rw.name}" ใช่หรือไม่? รางวัลที่มีประวัติการแลกแล้วจะไม่สามารถลบได้`}
                            />
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
            ),
          },
        ]}
      />

      {editReward && (
        <EditRewardModal reward={editReward} error={sp.edit ? sp.error : undefined} />
      )}
    </div>
  );
}
