import { createAdminClient } from "@/lib/supabase/admin";
import { Card, Button, Input, Label, Badge } from "@/components/ui";
import { createReward, updateReward, fulfillRedemption } from "@/lib/actions/admin";

export const dynamic = "force-dynamic";

type RewardRow = {
  id: string;
  name: string;
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
    reward_added?: string;
    reward_saved?: string;
    fulfilled?: string;
  }>;
}) {
  const sp = await searchParams;
  const db = createAdminClient();

  const [{ data: rewardsRaw }, { data: redemptionsRaw }] = await Promise.all([
    db.from("rewards").select("id, name, cost_points, stock").order("cost_points"),
    db
      .from("redemptions")
      .select("id, points_spent, status, users(name, email), rewards(name)")
      .eq("status", "pending"),
  ]);

  const rewards = (rewardsRaw ?? []) as RewardRow[];
  const redemptions = (redemptionsRaw ?? []) as unknown as RedemptionRow[];

  return (
    <div className="space-y-8">
      {sp.error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{sp.error}</div>
      )}
      {(sp.reward_added || sp.reward_saved || sp.fulfilled) && (
        <div className="rounded-xl bg-primary-soft px-4 py-3 text-sm text-primary-dark">
          บันทึกแล้ว
        </div>
      )}

      <div>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold">รายการแลกรางวัลที่รอดำเนินการ</h2>
          <span className="font-mono text-sm text-ink/40 tnum">{redemptions.length} รายการ</span>
        </div>
        {redemptions.length === 0 ? (
          <Card className="mt-3 text-center text-ink/50">ไม่มีรายการรอดำเนินการ</Card>
        ) : (
          <div className="mt-3 space-y-3">
            {redemptions.map((r) => (
              <Card key={r.id} className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{r.users?.name || r.users?.email}</p>
                  <p className="text-sm text-ink/50">
                    {r.rewards?.name} · <span className="font-mono tnum">{r.points_spent}</span> แต้ม
                  </p>
                </div>
                <form action={fulfillRedemption}>
                  <input type="hidden" name="id" value={r.id} />
                  <Button type="submit">ส่งมอบแล้ว</Button>
                </form>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="font-display text-xl font-bold">แคตตาล็อกรางวัล</h2>
        <div className="mt-3 space-y-3">
          {rewards.map((rw) => (
            <form key={rw.id} action={updateReward}>
              <input type="hidden" name="id" value={rw.id} />
              <Card className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="font-display font-bold">{rw.name}</span>
                  <Badge className={rw.stock > 0 ? "bg-primary-soft text-primary-dark" : "bg-lane text-muted"}>
                    คงเหลือ {rw.stock}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <Label>ชื่อรางวัล</Label>
                    <Input name="name" defaultValue={rw.name} required />
                  </div>
                  <div>
                    <Label>แต้มที่ใช้แลก</Label>
                    <Input name="cost_points" type="number" min="1" defaultValue={rw.cost_points} required />
                  </div>
                </div>
                <div>
                  <Label>จำนวนคงเหลือ</Label>
                  <Input name="stock" type="number" min="0" defaultValue={rw.stock} />
                </div>
                <Button variant="ghost" type="submit">
                  บันทึกรางวัลนี้
                </Button>
              </Card>
            </form>
          ))}
        </div>

        <form action={createReward} className="mt-4">
          <Card className="space-y-3">
            <p className="text-sm font-semibold">+ เพิ่มรางวัลใหม่</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Label>ชื่อรางวัล</Label>
                <Input name="name" required />
              </div>
              <div>
                <Label>แต้มที่ใช้แลก</Label>
                <Input name="cost_points" type="number" min="1" required />
              </div>
            </div>
            <div>
              <Label>จำนวนคงเหลือ</Label>
              <Input name="stock" type="number" min="0" defaultValue={0} />
            </div>
            <Button type="submit">เพิ่มรางวัล</Button>
          </Card>
        </form>
      </div>
    </div>
  );
}
