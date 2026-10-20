import Link from "next/link";
import { Eye, EyeOff, Gift, RotateCcw, Search } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge, Button, Card, HeadingIcon, Input, Label, LinkButton, Select, Tabs } from "@/components/ui";
import { CreateRewardModal } from "@/components/admin/create-reward-modal";
import { EditRewardModal } from "@/components/admin/edit-reward-modal";
import {
  RewardPickupLocationsTab,
  type RewardPickupLocation,
} from '@/components/admin/reward-pickup-locations-tab';
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import {
  deleteReward,
  fulfillRedemption,
  revertRedemptionFulfillment,
  setRewardVisibility,
} from "@/lib/actions/admin";

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
  pickup_location_id: string | null;
  allows_pickup: boolean;
  allows_shipping: boolean;
  is_active: boolean;
  reward_pickup_locations: { name: string } | null;
};

type RedemptionRow = {
  id: string;
  points_spent: number;
  status: string;
  fulfillment_method: 'pickup' | 'shipping';
  pickup_location_snapshot: Record<string, string> | null;
  shipping_address: Record<string, string> | null;
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
    redemption_q?: string;
    redemption_status?: string;
    reward_added?: string;
    reward_saved?: string;
    reward_deleted?: string;
    reward_visibility?: string;
    fulfilled?: string;
    reverted?: string;
    create_location?: string;
    edit_location?: string;
    location_q?: string;
    location_added?: string;
    location_saved?: string;
    location_deleted?: string;
  }>;
}) {
  const sp = await searchParams;
  const db = createAdminClient();

  const [rewardsResult, redemptionsResult, locationsResult] = await Promise.all([
    db.from('rewards').select('id, name, name_en, description, description_en, image_url, cost_points, stock, pickup_location_id, allows_pickup, allows_shipping, is_active, reward_pickup_locations(name)').order('cost_points'),
    db
      .from("redemptions")
      .select('id, points_spent, status, fulfillment_method, pickup_location_snapshot, shipping_address, users(name, email), rewards(name)')
      .order("status", { ascending: false }),
    db
      .from('reward_pickup_locations')
      .select('id, name, name_en, address, address_en, contact_phone, contact_phone_en, maps_url, instructions, instructions_en, is_primary, is_active')
      .order('is_primary', { ascending: false })
      .order('name'),
  ]);

  if (rewardsResult.error) throw new Error(rewardsResult.error.message);
  if (redemptionsResult.error) throw new Error(redemptionsResult.error.message);
  if (locationsResult.error) throw new Error(locationsResult.error.message);

  const rewards = (rewardsResult.data ?? []) as unknown as RewardRow[];
  const redemptions = (redemptionsResult.data ?? []) as unknown as RedemptionRow[];
  const locations = (locationsResult.data ?? []) as RewardPickupLocation[];
  const activeLocations = locations.filter((location) => location.is_active);
  const pendingRedemptions = redemptions.filter((redemption) => redemption.status === "pending");
  const fulfilledRedemptions = redemptions.filter((redemption) => redemption.status === "fulfilled");
  const defaultTab =
    sp.tab ??
    (sp.create === "1" || sp.edit || sp.reward_added || sp.reward_saved || sp.reward_deleted || sp.reward_visibility
      ? "catalog"
      : "redemptions");

  const q = (sp.q ?? "").trim();
  const locationQuery = (sp.location_q ?? '').trim();
  const searchNeedle = q.toLocaleLowerCase("th-TH");
  const filteredRewards = searchNeedle
    ? rewards.filter((rw) =>
        [rw.name, rw.name_en].some((value) => (value ?? "").toLocaleLowerCase("th-TH").includes(searchNeedle)),
      )
    : rewards;

  // ค้นหา/กรองรายการแลกรางวัล: ชื่อหรืออีเมลผู้แลก, ชื่อรางวัล, ผู้รับ/เบอร์/ที่อยู่จัดส่ง, สถานที่รับ
  const redemptionQuery = (sp.redemption_q ?? "").trim();
  const redemptionStatus =
    sp.redemption_status === "pending" || sp.redemption_status === "fulfilled" ? sp.redemption_status : "";
  const redemptionNeedle = redemptionQuery.toLocaleLowerCase("th-TH");
  const filteredRedemptions = redemptions.filter((r) => {
    if (redemptionStatus && r.status !== redemptionStatus) return false;
    if (!redemptionNeedle) return true;
    return [
      r.users?.name,
      r.users?.email,
      r.rewards?.name,
      r.shipping_address?.recipient,
      r.shipping_address?.phone,
      r.shipping_address?.address,
      r.shipping_address?.province,
      r.shipping_address?.postal_code,
      r.pickup_location_snapshot?.name,
    ].some((value) => (value ?? "").toLocaleLowerCase("th-TH").includes(redemptionNeedle));
  });

  const editReward = sp.edit ? rewards.find((rw) => rw.id === sp.edit) : undefined;

  return (
    <div className="space-y-8">
      {sp.error && sp.create !== "1" && !sp.edit && sp.create_location !== '1' && !sp.edit_location && sp.tab !== 'locations' && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{sp.error}</div>
      )}
      {(sp.reward_added || sp.reward_saved || sp.reward_deleted || sp.reward_visibility || sp.fulfilled || sp.reverted || sp.location_added || sp.location_saved || sp.location_deleted) && (
        <div className="rounded-xl bg-primary-soft px-4 py-3 text-sm text-primary-dark">
          {sp.reverted
            ? 'ย้อนสถานะเป็นรอดำเนินการแล้ว'
            : sp.reward_deleted
            ? 'ลบรางวัลแล้ว'
            : sp.reward_visibility === 'hidden'
              ? 'ซ่อนรางวัลจากแคตตาล็อกแล้ว ผู้ใช้จะไม่เห็นและแลกรางวัลนี้ไม่ได้'
              : sp.reward_visibility === 'shown'
                ? 'แสดงรางวัลในแคตตาล็อกแล้ว'
                : sp.location_deleted
              ? 'ลบสถานที่แล้ว'
              : 'บันทึกแล้ว'}
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
            <Badge className="bg-emerald-50 text-emerald-700">ส่งมอบแล้ว {fulfilledRedemptions.length}</Badge>
          </div>
        </div>
        <Card className="mt-3">
          <form method="get" className="space-y-4">
            <input type="hidden" name="tab" value="redemptions" />
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem_auto] sm:items-end">
              <div>
                <Label htmlFor="redemption-search">ค้นหา</Label>
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40"
                    aria-hidden="true"
                  />
                  <Input
                    id="redemption-search"
                    name="redemption_q"
                    defaultValue={redemptionQuery}
                    placeholder="ชื่อ/อีเมลผู้แลก, ชื่อรางวัล, ผู้รับ, เบอร์โทร"
                    className="pl-9"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="redemption-status">สถานะ</Label>
                <Select id="redemption-status" name="redemption_status" defaultValue={redemptionStatus}>
                  <option value="">ทั้งหมด</option>
                  <option value="pending">รอดำเนินการ</option>
                  <option value="fulfilled">ส่งมอบแล้ว</option>
                </Select>
              </div>
              <Button type="submit" className="w-full sm:w-auto" icon="search">
                ค้นหา
              </Button>
            </div>
            {(redemptionQuery || redemptionStatus) && (
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-mono text-sm text-ink/45 tnum">
                  พบ {filteredRedemptions.length} จาก {redemptions.length} รายการ
                </span>
                <Link
                  href="/admin/rewards?tab=redemptions"
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-lane px-4 text-sm font-semibold transition hover:bg-lane/50"
                >
                  <RotateCcw className="size-4" aria-hidden="true" />
                  ล้างการค้นหา
                </Link>
              </div>
            )}
          </form>
        </Card>
        {filteredRedemptions.length === 0 ? (
          <Card className="mt-3 text-center text-ink/50">
            {redemptionQuery || redemptionStatus
              ? "ไม่พบรายการแลกรางวัลที่ตรงกับเงื่อนไข"
              : "ยังไม่มีประวัติการแลกรางวัล"}
          </Card>
        ) : (
          <div className="mt-3 space-y-3">
            {filteredRedemptions.map((r) => (
              <Card key={r.id} className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{r.users?.name || r.users?.email || "ไม่ทราบชื่อ"}</p>
                    <Badge className={r.status === "pending" ? "bg-medal-soft text-medal" : "bg-emerald-50 text-emerald-700"}>
                      {r.status === "pending" ? "รอดำเนินการ" : "ส่งมอบแล้ว"}
                    </Badge>
                  </div>
                  <p className="text-sm text-ink/50">
                    {r.rewards?.name} · <span className="font-mono tnum">{r.points_spent}</span> แต้ม
                  </p>
                  <div className='mt-2 text-sm leading-6 text-ink/60'>
                    <p className='font-semibold text-ink'>
                      {r.fulfillment_method === 'pickup' ? 'รับด้วยตนเอง' : 'จัดส่ง'}
                    </p>
                    {r.fulfillment_method === 'pickup' ? (
                      <>
                        <p>{r.pickup_location_snapshot?.name}</p>
                        <p>{r.pickup_location_snapshot?.address}</p>
                      </>
                    ) : (
                      <>
                        <p>{r.shipping_address?.recipient}</p>
                        <p>{r.shipping_address?.address}</p>
                        <p>{r.shipping_address?.province} {r.shipping_address?.postal_code}</p>
                      </>
                    )}
                  </div>
                </div>
                {r.status === "pending" ? (
                  <form action={fulfillRedemption}>
                    <input type="hidden" name="id" value={r.id} />
                    <ConfirmDeleteButton
                      formAction={fulfillRedemption}
                      tone="confirm"
                      icon="success"
                      triggerLabel={r.fulfillment_method === 'pickup' ? 'ยืนยันรับแล้ว' : 'ยืนยันจัดส่งแล้ว'}
                      title={r.fulfillment_method === 'pickup' ? 'ยืนยันการรับรางวัล' : 'ยืนยันการจัดส่งรางวัล'}
                      confirmLabel={r.fulfillment_method === 'pickup' ? 'ยืนยันรับแล้ว' : 'ยืนยันจัดส่งแล้ว'}
                      description={`ยืนยันว่า${r.fulfillment_method === 'pickup' ? 'ส่งมอบรางวัลให้' : 'จัดส่งรางวัลถึง'} ${r.users?.name || r.users?.email || 'ผู้ใช้'} — "${r.rewards?.name ?? 'รางวัล'}" แล้วใช่หรือไม่? ระบบจะส่งแจ้งเตือนถึงผู้ใช้ทันที กรุณาตรวจชื่อผู้รับให้ถูกต้อง`}
                    />
                  </form>
                ) : (
                  <form action={revertRedemptionFulfillment}>
                    <input type="hidden" name="id" value={r.id} />
                    <ConfirmDeleteButton
                      formAction={revertRedemptionFulfillment}
                      icon="undo"
                      triggerLabel="ย้อนเป็นรอดำเนินการ"
                      title="ย้อนสถานะการแลกรางวัล"
                      confirmLabel="ยืนยันย้อนสถานะ"
                      className="border-amber-200 text-amber-800 hover:bg-amber-50"
                      description={`รายการ "${r.rewards?.name ?? 'รางวัล'}" ของ ${r.users?.name || r.users?.email || 'ผู้ใช้'} จะกลับเป็น "รอดำเนินการ" แต้มและจำนวนรางวัลไม่เปลี่ยน ถ้าผู้ใช้ได้รับแจ้งเตือนว่าส่งมอบแล้ว ระบบจะส่งข้อความแจ้งว่าแจ้งผิดให้อัตโนมัติ`}
                    />
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
            <CreateRewardModal
              initialOpen={sp.create === '1'}
              error={!sp.edit ? sp.error : undefined}
              locations={activeLocations}
            />
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
                    <tr
                      key={rw.id}
                      className={`align-top transition hover:bg-lane/20 ${rw.is_active ? "" : "bg-lane/30"}`}
                    >
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
                            <p className={`font-semibold ${rw.is_active ? "text-ink" : "text-ink/45"}`}>
                              {rw.name}
                              {!rw.is_active && (
                                <Badge className="ml-2 gap-1 bg-ink/10 align-middle text-ink/60">
                                  <EyeOff className="size-3" aria-hidden="true" /> ซ่อนอยู่
                                </Badge>
                              )}
                            </p>
                            {rw.name_en && (
                              <p className="mt-0.5 truncate text-xs text-ink/45">{rw.name_en}</p>
                            )}
                            <p className='mt-1 text-xs text-ink/55'>
                              {rw.reward_pickup_locations?.name ?? 'ยังไม่กำหนดสถานที่'}
                            </p>
                            <div className='mt-1 flex flex-wrap gap-1'>
                              {rw.allows_pickup && <Badge className='bg-primary-soft text-primary-dark'>รับเอง</Badge>}
                              {rw.allows_shipping && <Badge className='bg-lane text-ink/60'>จัดส่ง</Badge>}
                            </div>
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
                          <form action={setRewardVisibility}>
                            <input type="hidden" name="id" value={rw.id} />
                            <input type="hidden" name="visible" value={rw.is_active ? "0" : "1"} />
                            <Button
                              type="submit"
                              variant="ghost"
                              className="min-h-9 px-3 py-1"
                              aria-label={rw.is_active ? `ซ่อนรางวัล ${rw.name}` : `แสดงรางวัล ${rw.name}`}
                              title={rw.is_active ? "แสดงอยู่ — กดเพื่อซ่อน" : "ซ่อนอยู่ — กดเพื่อแสดง"}
                            >
                              {rw.is_active ? (
                                <Eye className="size-4" aria-hidden="true" />
                              ) : (
                                <EyeOff className="size-4 text-ink/45" aria-hidden="true" />
                              )}
                            </Button>
                          </form>
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
          {
            id: 'locations',
            label: `สถานที่รับของรางวัล (${locations.length})`,
            content: (
              <RewardPickupLocationsTab
                locations={locations}
                query={locationQuery}
                createLocation={sp.create_location === '1'}
                editLocationId={sp.edit_location}
                error={sp.tab === 'locations' ? sp.error : undefined}
              />
            ),
          },
        ]}
      />

      {editReward && (
        <EditRewardModal
          reward={editReward}
          error={sp.edit ? sp.error : undefined}
          locations={activeLocations}
        />
      )}
    </div>
  );
}
