import Link from "next/link";
import { notFound } from "next/navigation";
import { Medal, CalendarDays, Road } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, Button, Input, Label, Select, Badge, ImageUploadField, Tabs } from "@/components/ui";
import { EditEventModal } from "@/components/admin/edit-event-modal";
import { MedalDeleteButton } from "@/components/admin/medal-delete-button";
import { PhysicalMedalDeleteButton } from "@/components/admin/physical-medal-delete-button";
import { PackageMedalFields } from "@/components/admin/package-medal-fields";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import {
  createPackage,
  updatePackage,
  deletePackage,
  deleteEvent,
  createMedal,
  updateMedal,
  createPhysicalMedal,
  updatePhysicalMedal,
} from "@/lib/actions/admin";
import { manuallyApproveRegistration } from "@/lib/actions/admin-registrations";
import { registrationStatusLabel, type ShippingAddress } from "@/lib/admin/registrations";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

type PackageRow = {
  id: string;
  name: string;
  target_distance_km: number;
  price: number;
  activity_types: string[];
  has_physical_medal: boolean;
  digital_medal_id: string | null;
  digital_medal: { id: string; name: string } | null;
  physical_medal_id: string | null;
  physical_medal: { id: string; name: string } | null;
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

type PhysicalMedalRow = {
  id: string;
  name: string;
  tier: string;
  bonus_points: number;
  image_url: string | null;
  unlock_rule: { target_km?: number } | null;
  sort_order: number;
};

type EventRegistrationRow = {
  id: string;
  bib_number: string | null;
  shipping_address: ShippingAddress;
  status: string;
  registered_at: string;
  users: { name: string | null; email: string | null } | null;
  packages: { name: string } | null;
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
  open: "bg-green-100 text-green-700",
  closed: "bg-red-100 text-red-700",
};
const pricingLabel: Record<string, string> = { free: "ฟรี", paid: "มีค่าสมัคร" };
const registrationStatusClass: Record<string, string> = {
  pending: "bg-medal-soft text-medal",
  confirmed: "bg-primary-soft text-primary-dark",
  cancelled: "bg-red-100 text-red-700",
};

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
    package_deleted?: string;
    medal_added?: string;
    medal_saved?: string;
    medal_deleted?: string;
    physical_medal_added?: string;
    physical_medal_saved?: string;
    physical_medal_deleted?: string;
    registration_approved?: string;
    tab?: string;
  }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const db = createAdminClient();

  const { data: event } = await db
    .from("events")
    .select(
      "id, title, bib_prefix, description, cover_image, cover_position_x, cover_position_y, poster_image, pricing, start_date, end_date, status, packages(id, name, target_distance_km, price, activity_types, has_physical_medal, digital_medal_id, digital_medal:medals!packages_digital_medal_id_fkey(id, name), physical_medal_id, physical_medal:physical_medals!packages_physical_medal_id_fkey(id, name)), medals(id, name, tier, bonus_points, image_url, unlock_rule, sort_order), physical_medals(id, name, tier, bonus_points, image_url, unlock_rule, sort_order)",
    )
    .eq("id", id)
    .single();

  if (!event) notFound();
  const packages = (event.packages ?? []).map((packageRow) => ({
    ...packageRow,
    digital_medal: Array.isArray(packageRow.digital_medal)
      ? packageRow.digital_medal[0] ?? null
      : packageRow.digital_medal,
    physical_medal: Array.isArray(packageRow.physical_medal)
      ? packageRow.physical_medal[0] ?? null
      : packageRow.physical_medal,
  })) as PackageRow[];
  const medals = [...((event.medals ?? []) as MedalRow[])].sort(
    (a, b) =>
      a.sort_order - b.sort_order ||
      Number(a.unlock_rule?.target_km ?? 0) - Number(b.unlock_rule?.target_km ?? 0) ||
      a.name.localeCompare(b.name, "th"),
  );
  const physicalMedals = [...((event.physical_medals ?? []) as PhysicalMedalRow[])].sort(
    (a, b) =>
      a.sort_order - b.sort_order ||
      Number(a.unlock_rule?.target_km ?? 0) - Number(b.unlock_rule?.target_km ?? 0) ||
      a.name.localeCompare(b.name, "th"),
  );

  const [{ data: regs }, { data: subs }, { data: paidPayments }, { count: medalsUnlocked }] =
    await Promise.all([
      db
        .from("registrations")
        .select(
          "id, bib_number, shipping_address, status, registered_at, users(name, email), packages(name)",
        )
        .eq("event_id", id)
        .order("registered_at", { ascending: false }),
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

  const regList = (regs ?? []) as unknown as EventRegistrationRow[];
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

      <div className="flex flex-col items-start gap-3 sm:flex-row sm:justify-between">
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
        <div className="flex flex-wrap items-center gap-2">
          <EditEventModal
            event={{
              id: event.id,
              title: event.title,
              bib_prefix: event.bib_prefix,
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
          <form action={deleteEvent}>
            <input type="hidden" name="id" value={event.id} />
            <ConfirmDeleteButton
              formAction={deleteEvent}
              triggerLabel="ลบงาน"
              title="ยืนยันการลบงาน"
              description={`ต้องการลบงาน "${event.title}" ใช่หรือไม่? งานที่มีผู้สมัครแล้วจะไม่สามารถลบได้`}
            />
          </form>
        </div>
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
        {sp.package_deleted && (
          <p className="mt-1 text-sm text-primary-dark">ลบแพ็กเกจแล้ว</p>
        )}

        <div className="mt-3 space-y-3">
          {packages.map((p) => (
            <form key={p.id} action={updatePackage}>
              <input type="hidden" name="id" value={p.id} />
              <input type="hidden" name="event_id" value={event.id} />
              <Card className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="font-display font-bold text-charcoal">{p.name}</span>
                  {p.digital_medal && (
                    <Badge className="gap-1 bg-sky-100 text-sky-700">
                      <Medal className="h-3 w-3" /> เหรียญดิจิทัล: {p.digital_medal.name}
                    </Badge>
                  )}
                  {p.has_physical_medal && (
                    <Badge className="gap-1 bg-orange-100 text-orange-700">
                      <Medal className="h-3 w-3" /> เหรียญจริง
                      {p.physical_medal ? `: ${p.physical_medal.name}` : ""}
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                {event.pricing === "paid" && (
                  <div>
                    <Label>ราคา (บาท)</Label>
                    <Input name="price" type="number" min="0" defaultValue={p.price} />
                  </div>
                )}
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
                </div>
                <PackageMedalFields
                  digitalMedals={medals}
                  physicalMedals={physicalMedals}
                  defaultDigitalMedalId={p.digital_medal_id}
                  defaultPhysicalMedalId={p.physical_medal_id}
                  defaultHasPhysicalMedal={p.has_physical_medal}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="ghost" type="submit" icon="save">
                    บันทึกแพ็กเกจนี้
                  </Button>
                  <ConfirmDeleteButton
                    formAction={deletePackage}
                    triggerLabel="ลบแพ็กเกจ"
                    title="ยืนยันการลบแพ็กเกจ"
                    description={`ต้องการลบแพ็กเกจ "${p.name}" ใช่หรือไม่? แพ็กเกจที่มีผู้สมัครแล้วจะไม่สามารถลบได้`}
                  />
                </div>
              </Card>
            </form>
          ))}
        </div>

        <form action={createPackage} className="mt-4">
          <input type="hidden" name="event_id" value={event.id} />
          <Card className="space-y-3">
            <p className="text-sm font-semibold">+ เพิ่มแพ็กเกจใหม่</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label>ชื่อแพ็กเกจ</Label>
                <Input name="name" required />
              </div>
              <div>
                <Label>ระยะเป้าหมาย (km)</Label>
                <Input name="target_distance_km" type="number" min="1" required />
              </div>
            </div>
            {event.pricing === "paid" && (
              <div>
                <Label>ราคา (บาท)</Label>
                <Input name="price" type="number" min="0" defaultValue={0} />
              </div>
            )}
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <label className="flex items-center gap-1.5">
                <input type="checkbox" name="activity_types" value="run" defaultChecked />
                วิ่ง
              </label>
              <label className="flex items-center gap-1.5">
                <input type="checkbox" name="activity_types" value="walk" defaultChecked />
                เดิน
              </label>
            </div>
            <PackageMedalFields digitalMedals={medals} physicalMedals={physicalMedals} />
            <Button type="submit" icon="add">เพิ่มแพ็กเกจ</Button>
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
                  ปลดล็อกอัตโนมัติเมื่อระยะสะสมที่อนุมัติแล้วของผู้สมัครถึงเป้าที่ตั้งไว้ (ตั้งได้หลายเหรียญต่องาน)
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
                <div className="grid gap-3 sm:grid-cols-[12rem_minmax(0,1fr)]">
                  <ImageUploadField
                    name="image_url_file"
                    label="รูปเหรียญ"
                    defaultImageUrl={m.image_url}
                    compact
                    compactSize="fill"
                    className="h-full min-h-32"
                  />
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-display font-bold">{m.name}</span>
                        <Badge className="bg-medal-soft text-medal">
                          {tierLabel[m.tier] ?? m.tier}
                        </Badge>
                        <Badge className="bg-lane text-muted">ลำดับ {m.sort_order}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="ghost" type="submit" icon="save">
                          บันทึกเหรียญนี้
                        </Button>
                        <MedalDeleteButton medalName={m.name} />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <Label>ชื่อเหรียญ</Label>
                        <Input name="name" defaultValue={m.name} required />
                      </div>
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
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div>
                        <Label>ระดับ</Label>
                        <Select name="tier" defaultValue={m.tier}>
                          <option value="bronze">บรอนซ์</option>
                          <option value="silver">เงิน</option>
                          <option value="gold">ทอง</option>
                          <option value="legendary">ตำนาน</option>
                        </Select>
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
                  </div>
                </div>


              </Card>
            </form>
          ))}
        </div>

        <form action={createMedal} className="mt-4">
          <input type="hidden" name="event_id" value={event.id} />
          <Card className="space-y-3">
            <p className="text-sm font-semibold">+ เพิ่มเหรียญใหม่</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
            <Button type="submit" icon="add">เพิ่มเหรียญ</Button>
          </Card>
        </form>
              </div>
            ),
          },
          {
            id: "physical-medals",
            label: `เหรียญจริง (${physicalMedals.length})`,
            content: (
              <div>
                <p className="mb-3 text-sm text-ink/50">
                  กำหนดข้อมูลเหรียญจริงด้วยรูปแบบเดียวกับเหรียญดิจิทัล และเลือกผูกกับแพ็กเกจที่มีการจัดส่งเหรียญ
                </p>
                {sp.physical_medal_added && (
                  <p className="mt-1 text-sm text-primary-dark">เพิ่มเหรียญจริงแล้ว</p>
                )}
                {sp.physical_medal_saved && (
                  <p className="mt-1 text-sm text-primary-dark">บันทึกเหรียญจริงแล้ว</p>
                )}
                {sp.physical_medal_deleted && (
                  <p className="mt-1 text-sm text-primary-dark">ลบเหรียญจริงแล้ว</p>
                )}

                <div className="mt-3 space-y-3">
                  {physicalMedals.map((medal) => (
                    <form key={medal.id} action={updatePhysicalMedal}>
                      <input type="hidden" name="id" value={medal.id} />
                      <input type="hidden" name="event_id" value={event.id} />
                      <input
                        type="hidden"
                        name="existing_image_url"
                        value={medal.image_url ?? ""}
                      />
                      <Card className="space-y-3">
                        <div className="grid gap-3 sm:grid-cols-[12rem_minmax(0,1fr)]">
                          <ImageUploadField
                            name="image_url_file"
                            label="รูปเหรียญ"
                            defaultImageUrl={medal.image_url}
                            compact
                            compactSize="fill"
                            className="h-full min-h-32"
                          />
                          <div className="space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-display font-bold">{medal.name}</span>
                                <Badge className="bg-medal-soft text-medal">
                                  {tierLabel[medal.tier] ?? medal.tier}
                                </Badge>
                                <Badge className="bg-lane text-muted">
                                  ลำดับ {medal.sort_order}
                                </Badge>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Button variant="ghost" type="submit" icon="save">
                                  บันทึกเหรียญนี้
                                </Button>
                                <PhysicalMedalDeleteButton medalName={medal.name} />
                              </div>
                            </div>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                              <div>
                                <Label>ชื่อเหรียญ</Label>
                                <Input name="name" defaultValue={medal.name} required />
                              </div>
                              <div>
                                <Label>ระยะสะสมที่ต้องถึง (km)</Label>
                                <Input
                                  name="target_km"
                                  type="number"
                                  min="0.1"
                                  step="0.1"
                                  defaultValue={medal.unlock_rule?.target_km ?? 0}
                                  required
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                              <div>
                                <Label>ระดับ</Label>
                                <Select name="tier" defaultValue={medal.tier}>
                                  <option value="bronze">บรอนซ์</option>
                                  <option value="silver">เงิน</option>
                                  <option value="gold">ทอง</option>
                                  <option value="legendary">ตำนาน</option>
                                </Select>
                              </div>
                              <div>
                                <Label>แต้มโบนัส</Label>
                                <Input
                                  name="bonus_points"
                                  type="number"
                                  min="0"
                                  defaultValue={medal.bonus_points}
                                />
                              </div>
                              <div>
                                <Label>ลำดับการแสดง</Label>
                                <Input
                                  name="sort_order"
                                  type="number"
                                  min="0"
                                  defaultValue={medal.sort_order}
                                />
                              </div>
                            </div>
                          </div>
                        </div>


                      </Card>
                    </form>
                  ))}
                </div>

                <form action={createPhysicalMedal} className="mt-4">
                  <input type="hidden" name="event_id" value={event.id} />
                  <Card className="space-y-3">
                    <p className="text-sm font-semibold">+ เพิ่มเหรียญใหม่</p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                        <Input
                          name="sort_order"
                          type="number"
                          min="0"
                          defaultValue={physicalMedals.length + 1}
                        />
                      </div>
                    </div>
                    <ImageUploadField name="image_url_file" label="รูปเหรียญ" />
                    <Button type="submit" icon="add">เพิ่มเหรียญ</Button>
                  </Card>
                </form>
              </div>
            ),
          },
          {
            id: "registrations",
            label: `ผู้สมัคร (${regList.length})`,
            content: (
              <div className="space-y-3">
                {sp.registration_approved && (
                  <p className="text-sm text-primary-dark">
                    ยืนยันผู้สมัครและออกหมายเลข BIB แล้ว
                  </p>
                )}

                {regList.length === 0 ? (
                  <Card className="text-center text-ink/50">ยังไม่มีผู้สมัครในงานนี้</Card>
                ) : (
                  regList.map((registration) => {
                    const address = registration.shipping_address;
                    return (
                      <Card key={registration.id} className="space-y-3">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm text-ink/50">
                              {registration.packages?.name ?? "ไม่พบข้อมูลแพ็กเกจ"}
                            </p>
                            <p className="font-semibold">
                              {registration.users?.name ||
                                registration.users?.email ||
                                "ไม่ทราบชื่อ"}
                            </p>
                            {registration.users?.name && registration.users.email && (
                              <p className="text-sm text-ink/50">{registration.users.email}</p>
                            )}
                            <p className="mt-1 font-mono text-xs text-ink/40 tnum">
                              สมัครเมื่อ{" "}
                              {new Date(registration.registered_at).toLocaleString("th-TH", {
                                timeZone: "Asia/Bangkok",
                              })}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            {registration.bib_number && (
                              <span className="font-mono text-sm font-bold text-primary-dark tnum">
                                BIB {registration.bib_number}
                              </span>
                            )}
                            <Badge className={registrationStatusClass[registration.status]}>
                              {registrationStatusLabel[registration.status] ?? registration.status}
                            </Badge>
                          </div>
                        </div>

                        {address && (
                          <div className="border-t border-lane pt-3 text-sm text-ink/60">
                            <p className="font-medium text-ink/70">ที่อยู่จัดส่ง</p>
                            <p>
                              {address.recipient} · {address.phone}
                              <br />
                              {address.address} {address.province} {address.postal_code}
                            </p>
                          </div>
                        )}

                        {registration.status === "pending" && (
                          <form
                            action={manuallyApproveRegistration}
                            className="border-t border-lane pt-3"
                          >
                            <input
                              type="hidden"
                              name="registration_id"
                              value={registration.id}
                            />
                            <input type="hidden" name="event_id" value={event.id} />
                            <Button type="submit" icon="userCheck">
                              ยืนยันผู้สมัครและออก BIB
                            </Button>
                          </form>
                        )}
                      </Card>
                    );
                  })
                )}
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
