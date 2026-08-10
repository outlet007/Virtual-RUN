import { createAdminClient } from "@/lib/supabase/admin";
import { Card, Button, HeadingIcon, Input, Label, Badge, ImageUploadField, Textarea } from "@/components/ui";
import { CreateRewardModal } from "@/components/admin/create-reward-modal";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { updateReward, deleteReward, fulfillRedemption } from "@/lib/actions/admin";

export const dynamic = "force-dynamic";

type RewardRow = {
  id: string;
  name: string;
  description: string | null;
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
    create?: string;
    reward_added?: string;
    reward_saved?: string;
    reward_deleted?: string;
    fulfilled?: string;
  }>;
}) {
  const sp = await searchParams;
  const db = createAdminClient();

  const [{ data: rewardsRaw }, { data: redemptionsRaw }] = await Promise.all([
    db.from("rewards").select("id, name, description, image_url, cost_points, stock").order("cost_points"),
    db
      .from("redemptions")
      .select("id, points_spent, status, users(name, email), rewards(name)")
      .eq("status", "pending"),
  ]);

  const rewards = (rewardsRaw ?? []) as RewardRow[];
  const redemptions = (redemptionsRaw ?? []) as unknown as RedemptionRow[];

  return (
    <div className="space-y-8">
      {sp.error && sp.create !== "1" && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{sp.error}</div>
      )}
      {(sp.reward_added || sp.reward_saved || sp.reward_deleted || sp.fulfilled) && (
        <div className="rounded-xl bg-primary-soft px-4 py-3 text-sm text-primary-dark">
          {sp.reward_deleted ? "ลบรางวัลแล้ว" : "บันทึกแล้ว"}
        </div>
      )}

      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-display text-xl font-bold">
            <HeadingIcon name="clipboard" />
            รายการแลกรางวัลที่รอดำเนินการ
          </h2>
          <span className="font-mono text-sm text-ink/40 tnum">{redemptions.length} รายการ</span>
        </div>
        {redemptions.length === 0 ? (
          <Card className="mt-3 text-center text-ink/50">ไม่มีรายการรอดำเนินการ</Card>
        ) : (
          <div className="mt-3 space-y-3">
            {redemptions.map((r) => (
              <Card key={r.id} className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold">{r.users?.name || r.users?.email}</p>
                  <p className="text-sm text-ink/50">
                    {r.rewards?.name} · <span className="font-mono tnum">{r.points_spent}</span> แต้ม
                  </p>
                </div>
                <form action={fulfillRedemption}>
                  <input type="hidden" name="id" value={r.id} />
                  <Button type="submit" icon="success">ส่งมอบแล้ว</Button>
                </form>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="flex items-center gap-2 font-display text-xl font-bold">
            <HeadingIcon name="gift" />
            แคตตาล็อกรางวัล
          </h2>
          <CreateRewardModal initialOpen={sp.create === "1"} error={sp.error} />
        </div>
        <div className="mt-3 space-y-3">
          {rewards.map((rw) => (
            <form key={rw.id} action={updateReward}>
              <input type="hidden" name="id" value={rw.id} />
              <input type="hidden" name="existing_image_url" value={rw.image_url ?? ""} />
              <Card className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="font-display font-bold">{rw.name}</span>
                  <Badge className={rw.stock > 0 ? "bg-primary-soft text-primary-dark" : "bg-lane text-muted"}>
                    คงเหลือ {rw.stock}
                  </Badge>
                </div>
                <ImageUploadField
                  name="image_file"
                  label="รูปรางวัล"
                  defaultImageUrl={rw.image_url}
                />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="sm:col-span-2">
                    <Label>ชื่อรางวัล</Label>
                    <Input name="name" defaultValue={rw.name} required />
                  </div>
                  <div>
                    <Label>แต้มที่ใช้แลก</Label>
                    <Input name="cost_points" type="number" min="1" defaultValue={rw.cost_points} required />
                  </div>
                </div>
                <div>
                  <Label>รายละเอียดรางวัล</Label>
                  <Textarea
                    name="description"
                    rows={3}
                    defaultValue={rw.description ?? ""}
                    placeholder="อธิบายรายละเอียด เงื่อนไข หรือสิ่งที่ผู้ใช้จะได้รับ"
                  />
                </div>
                <div>
                  <Label>จำนวนคงเหลือ</Label>
                  <Input name="stock" type="number" min="0" defaultValue={rw.stock} />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="ghost" type="submit" icon="save">
                    บันทึกรางวัลนี้
                  </Button>
                  <ConfirmDeleteButton
                    formAction={deleteReward}
                    triggerLabel="ลบรางวัล"
                    title="ยืนยันการลบรางวัล"
                    description={`ต้องการลบรางวัล "${rw.name}" ใช่หรือไม่? รางวัลที่มีประวัติการแลกแล้วจะไม่สามารถลบได้`}
                  />
                </div>
              </Card>
            </form>
          ))}
        </div>

      </div>
    </div>
  );
}
