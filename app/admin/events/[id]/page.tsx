import Link from "next/link";
import { notFound } from "next/navigation";
import { Medal, CalendarDays, Road } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, Button, Input, Label, Select, Badge, ImageUploadField, Tabs } from "@/components/ui";
import { EditEventModal } from "@/components/admin/edit-event-modal";
import { MedalDeleteButton } from "@/components/admin/medal-delete-button";
import { createPackage, updatePackage, createMedal, updateMedal } from "@/lib/actions/admin";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

type PackageRow = {
  id: string;
  name: string;
  target_distance_km: number;
  price: number;
  activity_types: string[];
  has_physical_medal: boolean;
};

type MedalRow = {
  id: string;
  name: string;
  tier: string;
  bonus_points: number;
  image_url: string | null;
  unlock_rule: { target_km?: number } | null;
  sort_order: number;
};

const tierLabel: Record<string, string> = {
  bronze: "บรอนซ์",
  silver: "เงิน",
  gold: "ทอง",
  legendary: "ตำนาน",
};

const statusLabel: Record<string, string> = {
  draft: "ร่าง",
  open: "เปิดรับสมัคร",
  closed: "ปิดรับสมัคร",
};
const statusClass: Record<string, string> = {
  draft: "bg-lane text-muted",
  open: "bg-primary-soft text-primary-dark",
  closed: "bg-medal-soft text-medal",
};
const pricingLabel: Record<string, string> = { free: "ฟรี", paid: "มีค่าสมัคร" };

export default async function EventDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    error?: string;
    saved?: string;
    created?: string;
    package_added?: string;
    package_saved?: string;
    medal_added?: string;
    medal_saved?: string;
    medal_deleted?: string;
    tab?: string;
  }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const db = createAdminClient();

  const { data: event } = await db
    .from("events")
    .select(
      "id, title, description, cover_image, cover_position_x, cover_position_y, poster_image, pricing, start_date, end_date, status, packages(id, name, target_distance_km, price, activity_types, has_physical_medal), medals(id, name, tier, bonus_points, image_url, unlock_rule, sort_order)",
    )
    .eq("id", id)
    .single();

  if (!event) notFound();
  const packages = (event.packages ?? []) as PackageRow[];
  const medals = [...((event.medals ?? []) as MedalRow[])].sort(
    (a, b) =>
      a.sort_order - b.sort_order ||
      Number(a.unlock_rule?.target_km ?? 0) - Number(b.unlock_rule?.target_km ?? 0) ||
      a.name.localeCompare(b.name, "th"),
  );

  const [{ data: regs }, { data: subs }, { data: paidPayments }, { count: medalsUnlocked }] =
    await Promise.all([
      db.from("registrations").select("id, status").eq("event_id", id),
      db
        .from("submissions")
        .select("id, status, registrations!inner(event_id)")
        .eq("registrations.event_id", id),
      db
        .from("payments")
        .select("amount, registrations!inner(event_id)")
        .eq("status", "paid")
        .eq("registrations.event_id", id),
      db
        .from("user_medals")
        .select("id, medals!inner(event_id)", { count: "exact", head: true })
        .eq("medals.event_id", id),
    ]);

  const regList = regs ?? [];
  const subList = subs ?? [];
  const confirmedCount = regList.filter((r) => r.status === "confirmed").length;
  const pendingRegCount = regList.filter((r) => r.status === "pending").length;
  const cancelledCount = regList.filter((r) => r.status === "cancelled").length;
  const approvedSubs = subList.filter((s) => s.status === "approved").length;
  const pendingSubs = subList.filter((s) => s.status === "pending" || s.status === "flagged").length;
  const revenue = (paidPayments ?? []).reduce((sum, p) => sum + Number(p.amount), 0);

  const dashboardStats = [
    { label: "ผู้สมัครทั้งหมด", value: regList.length },
    { label: "ยืนยันแล้ว", value: confirmedCount },
    { label: "รอดำเนินการ", value: pendingRegCount },
    { label: "ยกเลิก", value: cancelledCount },
    { label: "ผลวิ่งอนุมัติแล้ว", value: approvedSubs },
    { label: "ผลวิ่งรอตรวจ", value: pendingSubs },
    { label: "ยอดชำระเงินสะสม (บาท)", value: revenue.toLocaleString(undefined, { maximumFractionDigits: 2 }) },
    { label: "เหรียญที่ปลดล็อกแล้ว", value: medalsUnlocked ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <Link href="/admin/events" className="text-sm text-ink/50 hover:text-ink">
        ← งานทั้งหมด
      </Link>

      {sp.error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{sp.error}</div>
      )}
      {(sp.saved || sp.created) && (
        <div className="rounded-xl bg-primary-soft px-4 py-3 text-sm text-primary-dark">
          บันทึกแล้ว
        </div>
      )}

      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-xl font-bold">{event.title}</h2>
            <Badge className={statusClass[event.status]}>{statusLabel[event.status]}</Badge>
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-1.5 font-mono text-xs text-accent tnum">
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" /> {formatDate(event.start_date)} –{" "}
              {formatDate(event.end_date)}
            </span>
            {packages.length > 0 && (
              <span className="inline-flex items-center gap-1">
                | <Road className="h-3.5 w-3.5" />{" "}
                {(() => {
                  const kms = packages.map((p) => p.target_distance_km);
                  const minKm = Math.min(...kms);
                  const maxKm = Math.max(...kms);
                  return minKm === maxKm ? `${minKm}` : `${minKm}–${maxKm}`;
                })()}{" "}
                km | {packages.length} แพ็กเกจ
              </span>
            )}
            <span>| {pricingLabel[event.pricing]}</span>
          </p>
        </div>
        <EditEventModal
          event={{
            id: event.id,
            title: event.title,
            description: event.description,
            cover_image: event.cover_image,
            cover_position_x: event.cover_position_x,
            cover_position_y: event.cover_position_y,
            poster_image: event.poster_image,
            pricing: event.pricing,
            status: event.status,
            start_date: event.start_date,
            end_date: event.end_date,
          }}
        />
      </div>

      <Tabs
        defaultTab={sp.tab}
        tabs={[
          {
            id: "overview",
            label: "ภาพรวม",
            content: (
              <div className="space-y-6">
                <Card className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="mb-1 text-xs uppercase tracking-wider text-ink/40">
                        รูปปกงาน (banner)
                      </p>
                      {event.cover_image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={event.cover_image}
                          alt=""
                          className="h-40 w-full rounded-xl border border-lane object-cover"
                          style={{
                            objectPosition:
                              [event.cover_position_x, event.cover_position_y].join("% ") + "%",
                          }}
                        />
                      ) : (
                        <div className="flex h-40 w-full items-center justify-center rounded-xl border border-dashed border-lane text-sm text-ink/30">
                          ยังไม่มีรูป
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="mb-1 text-xs uppercase tracking-wider text-ink/40">
                        รูป poster
                      </p>
                      {event.poster_image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={event.poster_image}
                          alt=""
                          className="h-40 w-full rounded-xl border border-lane object-cover"
                        />
                      ) : (
                        <div className="flex h-40 w-full items-center justify-center rounded-xl border border-dashed border-lane text-sm text-ink/30">
                          ยังไม่มีรูป
                        </div>
                      )}
                    </div>
                  </div>
                  {event.description && (
                    <div
                      className="prose prose-sm max-w-none text-ink/70"
                      dangerouslySetInnerHTML={{ __html: event.description }}
                    />
                  )}
                </Card>

                <div>
                  <h3 className="mb-3 font-display text-lg font-bold">สถิติงานนี้</h3>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {dashboardStats.map((s) => (
                      <Card key={s.label}>
                        <p className="text-xs uppercase tracking-wider text-ink/40">{s.label}</p>
                        <p className="mt-1 font-mono text-2xl font-bold tnum">{s.value}</p>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            ),
          },
          {
            id: "packages",
            label: `แพ็กเกจ (${packages.length})`,
            content: (
              <div>
                {sp.package_added && (
          <p className="mt-1 text-sm text-primary-dark">เพิ่มแพ็กเกจแล้ว</p>
        )}
        {sp.package_saved && (
          <p className="mt-1 text-sm text-primary-dark">บันทึกแพ็กเกจแล้ว</p>
        )}

        <div className="mt-3 space-y-3">
          {packages.map((p) => (
            <form key={p.id} action={updatePackage}>
              <input type="hidden" name="id" value={p.id} />
              <input type="hidden" name="event_id" value={event.id} />
              <Card className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="font-display font-bold text-charcoal">{p.name}</span>
                  {p.has_physical_medal && (
                    <Badge className="gap-1 bg-medal-soft text-medal">
                      <Medal className="h-3 w-3" /> เหรียญจริง
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>ชื่อแพ็กเกจ</Label>
                    <Input name="name" defaultValue={p.name} required />
                  </div>
                  <div>
                    <Label>ระยะเป้าหมาย (km)</Label>
                    <Input
                      name="target_distance_km"
                      type="number"
                      min="1"
                      defaultValue={p.target_distance_km}
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label>ราคา (บาท)</Label>
                  <Input name="price" type="number" min="0" defaultValue={p.price} />
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <label className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      name="activity_types"
                      value="run"
                      defaultChecked={p.activity_types.includes("run")}
                    />
                    วิ่ง
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      name="activity_types"
                      value="walk"
                      defaultChecked={p.activity_types.includes("walk")}
                    />
                    เดิน
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      name="has_physical_medal"
                      defaultChecked={p.has_physical_medal}
                    />
                    มีเหรียญกายภาพ
                  </label>
                </div>
                <Button variant="ghost" type="submit">
                  บันทึกแพ็กเกจนี้
                </Button>
              </Card>
            </form>
          ))}
        </div>

        <form action={createPackage} className="mt-4">
          <input type="hidden" name="event_id" value={event.id} />
          <Card className="space-y-3">
            <p className="text-sm font-semibold">+ เพิ่มแพ็กเกจใหม่</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>ชื่อแพ็กเกจ</Label>
                <Input name="name" required />
              </div>
              <div>
                <Label>ระยะเป้าหมาย (km)</Label>
                <Input name="target_distance_km" type="number" min="1" required />
              </div>
            </div>
            <div>
              <Label>ราคา (บาท)</Label>
              <Input name="price" type="number" min="0" defaultValue={0} />
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <label className="flex items-center gap-1.5">
                <input type="checkbox" name="activity_types" value="run" defaultChecked />
                วิ่ง
              </label>
              <label className="flex items-center gap-1.5">
                <input type="checkbox" name="activity_types" value="walk" defaultChecked />
                เดิน
              </label>
              <label className="flex items-center gap-1.5">
                <input type="checkbox" name="has_physical_medal" />
                มีเหรียญกายภาพ
              </label>
            </div>
            <Button type="submit">เพิ่มแพ็กเกจ</Button>
          </Card>
        </form>
              </div>
            ),
          },
          {
            id: "medals",
            label: `เหรียญดิจิทัล (${medals.length})`,
            content: (
              <div>
                <p className="mb-3 text-sm text-ink/50">
                  ปลดล็อกอัตโนมัติเมื่อระยะสะสมที่อนุมัติแล้วของใบสมัครถึงเป้าที่ตั้งไว้ (ตั้งได้หลายเหรียญต่องาน)
                </p>
                {sp.medal_added && <p className="mt-1 text-sm text-primary-dark">เพิ่มเหรียญแล้ว</p>}
                {sp.medal_saved && <p className="mt-1 text-sm text-primary-dark">บันทึกเหรียญแล้ว</p>}
                {sp.medal_deleted && <p className="mt-1 text-sm text-primary-dark">ลบเหรียญแล้ว</p>}

        <div className="mt-3 space-y-3">
          {medals.map((m) => (
            <form key={m.id} action={updateMedal}>
              <input type="hidden" name="id" value={m.id} />
              <input type="hidden" name="event_id" value={event.id} />
              <input type="hidden" name="existing_image_url" value={m.image_url ?? ""} />
              <Card className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="font-display font-bold">{m.name}</span>
                  <Badge className="bg-medal-soft text-medal">{tierLabel[m.tier] ?? m.tier}</Badge>
                  <Badge className="bg-lane text-muted">ลำดับ {m.sort_order}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>ชื่อเหรียญ</Label>
                    <Input name="name" defaultValue={m.name} required />
                  </div>
                  <div>
                    <Label>ระดับ</Label>
                    <Select name="tier" defaultValue={m.tier}>
                      <option value="bronze">บรอนซ์</option>
                      <option value="silver">เงิน</option>
                      <option value="gold">ทอง</option>
                      <option value="legendary">ตำนาน</option>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <Label>ระยะสะสมที่ต้องถึง (km)</Label>
                    <Input
                      name="target_km"
                      type="number"
                      min="0.1"
                      step="0.1"
                      defaultValue={m.unlock_rule?.target_km ?? 0}
                      required
                    />
                  </div>
                  <div>
                    <Label>แต้มโบนัส</Label>
                    <Input name="bonus_points" type="number" min="0" defaultValue={m.bonus_points} />
                  </div>
                  <div>
                    <Label>ลำดับการแสดง</Label>
                    <Input name="sort_order" type="number" min="0" defaultValue={m.sort_order} />
                  </div>
                </div>
                <ImageUploadField
                  name="image_url_file"
                  label="รูปเหรียญ"
                  defaultImageUrl={m.image_url}
                />
                <div className="flex flex-wrap gap-2">
                  <Button variant="ghost" type="submit">
                    บันทึกเหรียญนี้
                  </Button>
                  <MedalDeleteButton medalName={m.name} />
                </div>
              </Card>
            </form>
          ))}
        </div>

        <form action={createMedal} className="mt-4">
          <input type="hidden" name="event_id" value={event.id} />
          <Card className="space-y-3">
            <p className="text-sm font-semibold">+ เพิ่มเหรียญใหม่</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>ชื่อเหรียญ</Label>
                <Input name="name" required />
              </div>
              <div>
                <Label>ระดับ</Label>
                <Select name="tier" defaultValue="bronze">
                  <option value="bronze">บรอนซ์</option>
                  <option value="silver">เงิน</option>
                  <option value="gold">ทอง</option>
                  <option value="legendary">ตำนาน</option>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <Label>ระยะสะสมที่ต้องถึง (km)</Label>
                <Input name="target_km" type="number" min="0.1" step="0.1" required />
              </div>
              <div>
                <Label>แต้มโบนัส</Label>
                <Input name="bonus_points" type="number" min="0" defaultValue={0} />
              </div>
              <div>
                <Label>ลำดับการแสดง</Label>
                <Input name="sort_order" type="number" min="0" defaultValue={medals.length + 1} />
              </div>
            </div>
            <ImageUploadField name="image_url_file" label="รูปเหรียญ" />
            <Button type="submit">เพิ่มเหรียญ</Button>
          </Card>
        </form>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
