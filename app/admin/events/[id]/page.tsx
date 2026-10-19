import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Medal, Road, RotateCcw, Search } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  Card,
  Button,
  Input,
  Label,
  Select,
  Badge,
  HeadingIcon,
  ImageUploadField,
  LinkButton,
  Tabs,
} from "@/components/ui";
import { EditEventModal } from "@/components/admin/edit-event-modal";
import { EventLeaderboardCard } from "@/components/admin/event-leaderboard";
import { EventDistanceLevelsTab } from "@/components/admin/event-distance-levels-tab";
import { EventSubmissionsTab } from "@/components/admin/event-submissions-tab";
import { EventStaffRegistrationsTab } from "@/components/admin/event-staff-registrations-tab";
import { EventPaymentsTab } from "@/components/admin/event-payments-tab";
import { EventShipmentsTab } from "@/components/admin/event-shipments-tab";
import { RegistrationTrendChart } from "@/components/admin/registration-trend-chart";
import { MedalDeleteButton } from "@/components/admin/medal-delete-button";
import { PhysicalMedalDeleteButton } from "@/components/admin/physical-medal-delete-button";
import { PackageMedalFields } from "@/components/admin/package-medal-fields";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import {
  createPackage,
  updatePackage,
  deletePackage,
  movePackage,
  deleteEvent,
  createMedal,
  updateMedal,
  moveMedal,
  createPhysicalMedal,
  updatePhysicalMedal,
  movePhysicalMedal,
  updateDistanceLevelRegistration,
} from "@/lib/actions/admin";
import { manuallyApproveRegistration } from "@/lib/actions/admin-registrations";
import { requireAdmin } from "@/lib/auth/admin";
import { registrationStatusLabel, type ShippingAddress } from "@/lib/admin/registrations";
import { buildEventLeaderboards, buildRegistrationSeries } from "@/lib/admin/day8";
import { formatDate } from "@/lib/utils";
import { getBangkokDate } from "@/lib/event-registration";
import { getEffectiveEventStatus } from "@/lib/event-status";
import {
  getRegistrationRunProgress,
  registrationRunStatusLabel,
  type RegistrationRunProgressStatus,
} from "@/lib/registration-progress";
import {
  getEventDistanceLevelProgress,
  sortEventDistanceLevels,
  type EventDistanceLevel,
} from "@/lib/event-distance-levels";

export const dynamic = "force-dynamic";

type PackageRow = {
  id: string;
  name: string;
  name_en: string | null;
  target_distance_km: number;
  price: number;
  activity_types: string[];
  has_physical_medal: boolean;
  digital_medal_id: string | null;
  digital_medal: { id: string; name: string } | null;
  physical_medal_id: string | null;
  physical_medal: { id: string; name: string } | null;
  sort_order: number;
};

type MedalRow = {
  id: string;
  name: string;
  name_en: string | null;
  tier: string;
  bonus_points: number;
  image_url: string | null;
  unlock_rule: { target_km?: number } | null;
  sort_order: number;
};

type PhysicalMedalRow = {
  id: string;
  name: string;
  name_en: string | null;
  description_en: string | null;
  tier: string;
  bonus_points: number;
  image_url: string | null;
  unlock_rule: { target_km?: number } | null;
  sort_order: number;
};

type EventDistanceLevelRow = EventDistanceLevel & {
  digital_medal_id: string | null;
  reward_description: string | null;
  reward_description_en: string | null;
  bonus_points: number;
};

type EventRegistrationRow = {
  id: string;
  bib_number: string | null;
  shipping_address: ShippingAddress;
  status: string;
  registered_at: string;
  users: { name: string | null; email: string | null } | null;
  packages: { name: string; target_distance_km: number } | null;
};

type Relation<T> = T | T[] | null;
type EventSubmissionRow = {
  id: string;
  registration_id: string;
  status: string;
  distance_km: number | string;
  user_id: string;
  users: Relation<{ name: string | null; email: string | null }>;
};

function firstRelation<T>(value: Relation<T>) {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

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
const registrationRunStatusClass: Record<RegistrationRunProgressStatus, string> = {
  registration_pending: "bg-medal-soft text-medal",
  not_started: "bg-lane text-muted",
  in_progress: "bg-sky-100 text-sky-700",
  completed: "bg-green-100 text-green-700",
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
    package_reordered?: string;
    medal_added?: string;
    medal_saved?: string;
    medal_deleted?: string;
    medal_reordered?: string;
    physical_medal_added?: string;
    physical_medal_saved?: string;
    physical_medal_deleted?: string;
    physical_medal_reordered?: string;
    distance_level_added?: string;
    distance_level_saved?: string;
    distance_level_deleted?: string;
    registration_saved?: string;
    registration_approved?: string;
    registration_q?: string;
    registration_status?: string;
    submission_status?: string;
    submission_q?: string;
    submission_activity?: string;
    submission_ocr?: string;
    reviewed?: string;
    ocr_reprocessed?: string;
    payment_confirmed?: string;
    payment_rejected?: string;
    payment_q?: string;
    shipment_saved?: string;
    shipment_error?: string;
    shipment_q?: string;
    shipment_status?: string;
    tab?: string;
    period?: string;
  }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const period = sp.period === "monthly" ? "monthly" : "daily";
  const { role } = await requireAdmin();
  const db = createAdminClient();

  if (role === "staff") {
    const { data: staffEvent } = await db
      .from("events")
      .select("id, title, pricing")
      .eq("id", id)
      .single();

    if (!staffEvent) notFound();
    const staffEventIsPaid = staffEvent.pricing === "paid";

    return (
      <div className="space-y-6">
        <Link href="/admin/events" className="text-sm text-ink/50 hover:text-ink">
          ← งานทั้งหมด
        </Link>
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary-dark">
            ตรวจผลวิ่ง
          </p>
          <h2 className="mt-1 font-display text-2xl font-bold">{staffEvent.title}</h2>
        </div>
        <Tabs
          defaultTab={
            sp.tab === "submissions" ||
            (staffEventIsPaid && (sp.tab === "payments" || sp.tab === "shipments"))
              ? sp.tab
              : "registrations"
          }
          tabs={[
            {
              id: "registrations",
              label: "ผู้สมัคร",
              content: <EventStaffRegistrationsTab eventId={id} searchParams={sp} />,
            },
            {
              id: "submissions",
              label: "ตรวจผลวิ่ง",
              content: <EventSubmissionsTab eventId={id} searchParams={sp} />,
            },
            ...(staffEventIsPaid ? [
              {
                id: "payments",
                label: "การชำระเงิน",
                content: <EventPaymentsTab eventId={id} searchParams={sp} />,
              },
              {
                id: "shipments",
                label: "จัดส่งเหรียญ",
                content: <EventShipmentsTab eventId={id} searchParams={sp} />,
              },
            ] : []),
          ]}
        />
      </div>
    );
  }

  const { data: event } = await db
    .from("events")
    .select(
      "id, title, title_en, bib_prefix, description, description_en, cover_image, cover_position_x, cover_position_y, poster_image, pricing, event_mode, audience, start_date, end_date, status, packages(id, name, name_en, target_distance_km, price, activity_types, has_physical_medal, digital_medal_id, digital_medal:medals!packages_digital_medal_id_fkey(id, name, name_en), physical_medal_id, physical_medal:physical_medals!packages_physical_medal_id_fkey(id, name, name_en), sort_order), medals(id, name, name_en, tier, bonus_points, image_url, unlock_rule, sort_order), physical_medals(id, name, name_en, description_en, tier, bonus_points, image_url, unlock_rule, sort_order), event_distance_levels(id, name, name_en, target_distance_km, sort_order, digital_medal_id, reward_description, reward_description_en, bonus_points)",
    )
    .eq("id", id)
    .single();

  if (!event) notFound();
  const effectiveStatus = getEffectiveEventStatus(event.status, event.end_date, getBangkokDate());
  const packages = (event.packages ?? [])
    .map((packageRow) => ({
      ...packageRow,
      digital_medal: Array.isArray(packageRow.digital_medal)
        ? packageRow.digital_medal[0] ?? null
        : packageRow.digital_medal,
      physical_medal: Array.isArray(packageRow.physical_medal)
        ? packageRow.physical_medal[0] ?? null
        : packageRow.physical_medal,
    }))
    .sort((a, b) => a.sort_order - b.sort_order) as PackageRow[];
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
  const distanceLevels = sortEventDistanceLevels(
    (event.event_distance_levels ?? []) as EventDistanceLevelRow[],
  );

  const [{ data: regs }, { data: subs }, { data: paidPayments }, { count: medalsUnlocked }] =
    await Promise.all([
      db
        .from("registrations")
        .select(
          "id, bib_number, shipping_address, status, registered_at, users(name, email), packages(name, target_distance_km)",
        )
        .eq("event_id", id)
        .order("registered_at", { ascending: false }),
      db
        .from("submissions")
        .select("id, registration_id, status, distance_km, user_id, users!submissions_user_id_fkey(name, email), registrations!inner(event_id)")
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
  const registrationQuery = (sp.registration_q ?? "").trim();
  const registrationStatus = ["pending", "confirmed", "cancelled"].includes(
    sp.registration_status ?? "",
  )
    ? sp.registration_status
    : "all";
  const registrationSearchNeedle = registrationQuery
    .normalize("NFKC")
    .toLocaleLowerCase("th-TH");
  const filteredRegList = regList.filter((registration) => {
    if (registrationStatus !== "all" && registration.status !== registrationStatus) return false;
    if (!registrationSearchNeedle) return true;
    const address = registration.shipping_address;
    return [
      registration.users?.name,
      registration.users?.email,
      registration.bib_number,
      registration.packages?.name,
      address?.recipient,
      address?.phone,
      address?.address,
      address?.province,
      address?.postal_code,
    ].some((value) =>
      String(value ?? "")
        .normalize("NFKC")
        .toLocaleLowerCase("th-TH")
        .includes(registrationSearchNeedle),
    );
  });
  const registrationExportParams = new URLSearchParams();
  if (registrationQuery) registrationExportParams.set("registration_q", registrationQuery);
  if (registrationStatus !== "all" && registrationStatus) {
    registrationExportParams.set("registration_status", registrationStatus);
  }
  const registrationExportQuery = registrationExportParams.toString();
  const registrationExportHref =
    "/admin/events/" +
    event.id +
    "/registrations/export" +
    (registrationExportQuery ? "?" + registrationExportQuery : "");
  const subList = (subs ?? []) as unknown as EventSubmissionRow[];
  const confirmedCount = regList.filter((r) => r.status === "confirmed").length;
  const pendingRegCount = regList.filter((r) => r.status === "pending").length;
  const cancelledCount = regList.filter((r) => r.status === "cancelled").length;
  const approvedSubs = subList.filter((s) => s.status === "approved").length;
  const pendingSubs = subList.filter((s) => s.status === "pending" || s.status === "flagged").length;
  const revenue = (paidPayments ?? []).reduce((sum, p) => sum + Number(p.amount), 0);
  const approvedDistanceKm = subList
    .filter((submission) => submission.status === "approved")
    .reduce((sum, submission) => sum + Number(submission.distance_km), 0);
  const approvedDistanceByRegistration = subList.reduce((distances, submission) => {
    if (submission.status !== "approved") return distances;
    distances.set(
      submission.registration_id,
      (distances.get(submission.registration_id) ?? 0) + Number(submission.distance_km),
    );
    return distances;
  }, new Map<string, number>());
  const registrationSeries = buildRegistrationSeries(
    regList.map((registration) => ({ registeredAt: registration.registered_at })),
    period,
  );
  const registrationSeriesTotal = registrationSeries.reduce(
    (sum, point) => sum + point.registrations,
    0,
  );
  const [eventLeaderboard] = buildEventLeaderboards(
    subList.flatMap((submission) => {
      if (submission.status !== "approved") return [];
      const user = firstRelation(submission.users);
      return [{
        eventId: event.id,
        eventTitle: event.title,
        userId: submission.user_id,
        userName: user?.name || user?.email || "ไม่ทราบชื่อ",
        distanceKm: Number(submission.distance_km),
      }];
    }),
  );

  const dashboardStats = [
    { label: "ผู้สมัครทั้งหมด", value: regList.length },
    { label: "ยืนยันแล้ว", value: confirmedCount },
    { label: "รอดำเนินการ", value: pendingRegCount },
    { label: "ยกเลิก", value: cancelledCount },
    { label: "ผลวิ่งอนุมัติแล้ว", value: approvedSubs },
    { label: "ผลวิ่งรอตรวจ", value: pendingSubs },
    {
      label: "ระยะสะสมที่อนุมัติ (กม.)",
      value: approvedDistanceKm.toLocaleString("th-TH", { maximumFractionDigits: 1 }),
    },
    { label: "ยอดชำระเงินสะสม (บาท)", value: revenue.toLocaleString(undefined, { maximumFractionDigits: 2 }) },
    { label: "เหรียญที่ปลดล็อกแล้ว", value: medalsUnlocked ?? 0 },
  ];

  // งานระดับระยะไม่แสดงแท็บแพ็กเกจ ระบบใช้ package ภายในรายการแรกเป็นค่าการสมัคร
  const isDistanceLevels = event.event_mode === "distance_levels";
  // งานฟรีไม่มีการชำระเงิน เหรียญจริง และการจัดส่ง จึงไม่แสดงแท็บเหล่านี้
  const isPaidEvent = event.pricing === "paid";
  const registrationPackage = isDistanceLevels ? packages[0] ?? null : null;
  const defaultTab =
    isDistanceLevels && sp.tab === "packages"
      ? "distance-levels"
      : !isDistanceLevels && sp.tab === "distance-levels"
        ? "packages"
        : sp.tab;

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
      {isDistanceLevels && (distanceLevels.length === 0 || !registrationPackage) && (
        <div role="status" className="rounded-xl bg-medal-soft px-4 py-3 text-sm text-medal">
          ผู้ใช้ยังสมัครงานนี้ไม่ได้ —{" "}
          {distanceLevels.length === 0
            ? "กรุณาเพิ่มระดับระยะอย่างน้อย 1 ระดับในแท็บระดับระยะ"
            : "กรุณากดบันทึกการตั้งค่าการสมัครในแท็บระดับระยะ"}
        </div>
      )}

      <div className="flex flex-col items-start gap-3 sm:flex-row sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="flex items-center gap-2 font-display text-xl font-bold">
              <HeadingIcon name="calendar" />
              {event.title}
            </h2>
            <Badge className={statusClass[effectiveStatus]}>{statusLabel[effectiveStatus]}</Badge>
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-1.5 font-mono text-xs text-accent tnum">
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" /> {formatDate(event.start_date)} –{" "}
              {formatDate(event.end_date)}
            </span>
            {!isDistanceLevels && packages.length > 0 && (
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
              title_en: event.title_en,
              bib_prefix: event.bib_prefix,
              description: event.description,
              description_en: event.description_en,
              cover_image: event.cover_image,
              cover_position_x: event.cover_position_x,
              cover_position_y: event.cover_position_y,
              poster_image: event.poster_image,
              pricing: event.pricing,
              event_mode: event.event_mode,
              audience: event.audience,
              status: effectiveStatus,
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
        defaultTab={defaultTab}
        tabs={[
          {
            id: "statistics",
            label: "สถิติงาน",
            content: (
              <div className="space-y-6">
                <div>
                  <h3 className="mb-3 flex items-center gap-2 font-display text-lg font-bold">
                    <HeadingIcon name="overview" />
                    สถิติงานนี้
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {dashboardStats.map((s) => (
                      <Card key={s.label}>
                        <p className="text-xs uppercase tracking-wider text-ink/40">{s.label}</p>
                        <p className="mt-1 font-mono text-2xl font-bold tnum">{s.value}</p>
                      </Card>
                    ))}
                  </div>
                </div>

                <section aria-labelledby="event-registration-trend-heading">
                  <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <h3 id="event-registration-trend-heading" className="flex items-center gap-2 font-display text-lg font-bold">
                        <HeadingIcon name="chart" />
                        แนวโน้มผู้สมัคร
                        {period === "daily" ? " 30 วันล่าสุด" : " 12 เดือนล่าสุด"}
                      </h3>
                      <p className="mt-1 text-sm text-ink/50">
                        รวม {registrationSeriesTotal.toLocaleString("th-TH")} คนในช่วงที่เลือก
                      </p>
                    </div>
                    <div className="flex rounded-xl border border-lane p-1" aria-label="เลือกช่วงเวลาของกราฟ">
                      <Link
                        href={`/admin/events/${event.id}?tab=statistics&period=daily`}
                        aria-current={period === "daily" ? "page" : undefined}
                        className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                          period === "daily" ? "bg-ink text-paper" : "text-ink/60"
                        }`}
                      >
                        รายวัน
                      </Link>
                      <Link
                        href={`/admin/events/${event.id}?tab=statistics&period=monthly`}
                        aria-current={period === "monthly" ? "page" : undefined}
                        className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                          period === "monthly" ? "bg-ink text-paper" : "text-ink/60"
                        }`}
                      >
                        รายเดือน
                      </Link>
                    </div>
                  </div>
                  <Card>
                    <div className="overflow-x-auto pb-1">
                      <RegistrationTrendChart data={registrationSeries} />
                    </div>
                  </Card>
                </section>

                <section aria-labelledby="event-leaderboard-heading">
                  <div className="mb-3">
                    <h3 id="event-leaderboard-heading" className="flex items-center gap-2 font-display text-lg font-bold">
                      <HeadingIcon name="trophy" className="text-medal" />
                      อันดับระยะสะสมสูงสุด
                    </h3>
                    <p className="mt-1 text-sm text-ink/50">
                      Top 10 จากผลวิ่งที่อนุมัติแล้วของงานนี้เท่านั้น
                    </p>
                  </div>
                  <EventLeaderboardCard leaderboard={eventLeaderboard} />
                </section>
              </div>
            ),
          },
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
              </div>
            ),
          },
          ...(!isDistanceLevels ? [{
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
        {sp.package_reordered && (
          <p className="mt-1 text-sm text-primary-dark">ย้ายลำดับแพ็กเกจแล้ว</p>
        )}

        <div className="mt-3 space-y-3">
          {packages.map((p, index) => (
            <form key={p.id} action={updatePackage}>
              <input type="hidden" name="id" value={p.id} />
              <input type="hidden" name="event_id" value={event.id} />
              <Card className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="bg-lane text-muted">ลำดับ {index + 1}</Badge>
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
                  <div className="flex items-center gap-2">
                    <Button
                      type="submit"
                      variant="ghost"
                      formAction={movePackage.bind(null, p.id, event.id, "up")}
                      disabled={index === 0}
                      icon="up">
                      เลื่อนขึ้น
                    </Button>
                    <Button
                      type="submit"
                      variant="ghost"
                      formAction={movePackage.bind(null, p.id, event.id, "down")}
                      disabled={index === packages.length - 1}
                      icon="down">
                      เลื่อนลง
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div><Label>ชื่อแพ็กเกจ (ไทย)</Label><Input name="name" defaultValue={p.name} required /></div>
                  <div><Label>Package Name (English)</Label><Input name="name_en" defaultValue={p.name_en ?? ""} /></div>
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
                  showPhysicalMedal={isPaidEvent}
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
              <div><Label>ชื่อแพ็กเกจ (ไทย)</Label><Input name="name" required /></div>
              <div><Label>Package Name (English)</Label><Input name="name_en" /></div>
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
            <PackageMedalFields
              digitalMedals={medals}
              physicalMedals={physicalMedals}
              showPhysicalMedal={isPaidEvent}
            />
            <Button type="submit" icon="add">เพิ่มแพ็กเกจ</Button>
          </Card>
        </form>
              </div>
            ),
          }] : []),
          ...(isDistanceLevels ? [{
            id: "distance-levels",
            label: `ระดับระยะ (${distanceLevels.length})`,
            content: (
              <div className="space-y-4">
                <form action={updateDistanceLevelRegistration}>
                  <input type="hidden" name="event_id" value={event.id} />
                  <Card className="space-y-3">
                    <div>
                      <p className="font-semibold">ตั้งค่าการสมัคร</p>
                      <p className="text-sm text-ink/50">
                        ผู้ใช้สมัครงานครั้งเดียวจากปุ่มสมัครใต้ระดับระยะสะสม เหรียญดิจิทัลกำหนดแยกในแต่ละระดับ
                      </p>
                    </div>
                    {sp.registration_saved && (
                      <p className="text-sm text-primary-dark">บันทึกการตั้งค่าการสมัครแล้ว</p>
                    )}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {event.pricing === "paid" && (
                        <div>
                          <Label>ค่าสมัคร (บาท)</Label>
                          <Input
                            name="price"
                            type="number"
                            min="0"
                            defaultValue={registrationPackage?.price ?? 0}
                          />
                        </div>
                      )}
                      {isPaidEvent && (
                      <div>
                        <Label>เหรียญจริง (จัดส่งเมื่อผ่านระดับสุดท้าย)</Label>
                        <Select
                          name="physical_medal_id"
                          defaultValue={registrationPackage?.physical_medal_id ?? ""}
                        >
                          <option value="">ไม่มีเหรียญจริง</option>
                          {physicalMedals.map((medal) => (
                            <option key={medal.id} value={medal.id}>
                              {medal.name}
                            </option>
                          ))}
                        </Select>
                      </div>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <label className="flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          name="activity_types"
                          value="run"
                          defaultChecked={registrationPackage?.activity_types.includes("run") ?? true}
                        />
                        วิ่ง
                      </label>
                      <label className="flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          name="activity_types"
                          value="walk"
                          defaultChecked={registrationPackage?.activity_types.includes("walk") ?? true}
                        />
                        เดิน
                      </label>
                    </div>
                    <Button
                      type="submit"
                      variant="ghost"
                      icon="save"
                      disabled={distanceLevels.length === 0}
                    >
                      บันทึกการตั้งค่าการสมัคร
                    </Button>
                  </Card>
                </form>
                <EventDistanceLevelsTab
                  eventId={event.id}
                  eventMode={event.event_mode}
                  levels={distanceLevels}
                  medals={medals.map((medal) => ({ id: medal.id, name: medal.name }))}
                  added={Boolean(sp.distance_level_added)}
                  saved={Boolean(sp.distance_level_saved)}
                  deleted={Boolean(sp.distance_level_deleted)}
                />
              </div>
            ),
          }] : []),
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
                {sp.medal_reordered && <p className="mt-1 text-sm text-primary-dark">ย้ายลำดับเหรียญแล้ว</p>}

        <div className="mt-3 space-y-3">
          {medals.map((m, index) => (
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
                        <Badge className="bg-lane text-muted">ลำดับ {index + 1}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="ghost"
                          type="submit"
                          formAction={moveMedal.bind(null, m.id, event.id, "up")}
                          disabled={index === 0}
                          icon="up">
                          เลื่อนขึ้น
                        </Button>
                        <Button
                          variant="ghost"
                          type="submit"
                          formAction={moveMedal.bind(null, m.id, event.id, "down")}
                          disabled={index === medals.length - 1}
                          icon="down">
                          เลื่อนลง
                        </Button>
                        <Button variant="ghost" type="submit" icon="save">
                          บันทึกเหรียญนี้
                        </Button>
                        <MedalDeleteButton medalName={m.name} />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div><Label>ชื่อเหรียญ (ไทย)</Label><Input name="name" defaultValue={m.name} required /></div>
                      <div><Label>Medal Name (English)</Label><Input name="name_en" defaultValue={m.name_en ?? ""} /></div>
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
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
              <div><Label>ชื่อเหรียญ (ไทย)</Label><Input name="name" required /></div>
              <div><Label>Medal Name (English)</Label><Input name="name_en" /></div>
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
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label>ระยะสะสมที่ต้องถึง (km)</Label>
                <Input name="target_km" type="number" min="0.1" step="0.1" required />
              </div>
              <div>
                <Label>แต้มโบนัส</Label>
                <Input name="bonus_points" type="number" min="0" defaultValue={0} />
              </div>
            </div>
            <ImageUploadField name="image_url_file" label="รูปเหรียญ" />
            <Button type="submit" icon="add">เพิ่มเหรียญ</Button>
          </Card>
        </form>
              </div>
            ),
          },
          ...(isPaidEvent ? [{
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
                {sp.physical_medal_reordered && (
                  <p className="mt-1 text-sm text-primary-dark">ย้ายลำดับเหรียญจริงแล้ว</p>
                )}

                <div className="mt-3 space-y-3">
                  {physicalMedals.map((medal, index) => (
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
                                  ลำดับ {index + 1}
                                </Badge>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  variant="ghost"
                                  type="submit"
                                  formAction={movePhysicalMedal.bind(null, medal.id, event.id, "up")}
                                  disabled={index === 0}
                                  icon="up">
                                  เลื่อนขึ้น
                                </Button>
                                <Button
                                  variant="ghost"
                                  type="submit"
                                  formAction={movePhysicalMedal.bind(null, medal.id, event.id, "down")}
                                  disabled={index === physicalMedals.length - 1}
                                  icon="down">
                                  เลื่อนลง
                                </Button>
                                <Button variant="ghost" type="submit" icon="save">
                                  บันทึกเหรียญนี้
                                </Button>
                                <PhysicalMedalDeleteButton medalName={medal.name} />
                              </div>
                            </div>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                              <div><Label>ชื่อเหรียญจริง (ไทย)</Label><Input name="name" defaultValue={medal.name} required /></div>
                              <div><Label>Physical Medal Name (English)</Label><Input name="name_en" defaultValue={medal.name_en ?? ""} /></div>
                              <div><Label>Description (English)</Label><Input name="description_en" defaultValue={medal.description_en ?? ""} /></div>
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
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                      <div><Label>ชื่อเหรียญจริง (ไทย)</Label><Input name="name" required /></div>
                      <div><Label>Physical Medal Name (English)</Label><Input name="name_en" /></div>
                      <div><Label>Description (English)</Label><Input name="description_en" /></div>
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
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <Label>ระยะสะสมที่ต้องถึง (km)</Label>
                        <Input name="target_km" type="number" min="0.1" step="0.1" required />
                      </div>
                      <div>
                        <Label>แต้มโบนัส</Label>
                        <Input name="bonus_points" type="number" min="0" defaultValue={0} />
                      </div>
                    </div>
                    <ImageUploadField name="image_url_file" label="รูปเหรียญ" />
                    <Button type="submit" icon="add">เพิ่มเหรียญ</Button>
                  </Card>
                </form>
              </div>
            ),
          }] : []),
          {
            id: "registrations",
            label: "ผู้สมัคร (" + regList.length + ")",
            content: (
              <div className="space-y-4">
                {sp.registration_approved && (
                  <div className="rounded-xl bg-primary-soft px-4 py-3 text-sm text-primary-dark">
                    ยืนยันผู้สมัครและออกหมายเลข BIB แล้ว
                  </div>
                )}

                <Card>
                  <form method="get" className="space-y-4">
                    <input type="hidden" name="tab" value="registrations" />
                    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_240px_auto] lg:items-end">
                      <div>
                        <Label htmlFor="event-registration-search">ค้นหาผู้สมัคร</Label>
                        <div className="relative">
                          <Search
                            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink/40"
                            aria-hidden="true"
                          />
                          <Input
                            id="event-registration-search"
                            name="registration_q"
                            defaultValue={registrationQuery}
                            placeholder="ชื่อ อีเมล BIB แพ็กเกจ หรือที่อยู่"
                            className="pl-9"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="event-registration-status">สถานะ</Label>
                        <Select
                          id="event-registration-status"
                          name="registration_status"
                          defaultValue={registrationStatus}
                        >
                          <option value="all">ทุกสถานะ</option>
                          <option value="pending">รอดำเนินการ</option>
                          <option value="confirmed">ยืนยันแล้ว</option>
                          <option value="cancelled">ยกเลิก</option>
                        </Select>
                      </div>
                      <Button type="submit" className="w-full lg:w-auto" icon="search">
                        ค้นหา
                      </Button>
                    </div>

                    {(registrationQuery || registrationStatus !== "all") && (
                      <Link
                        href={"/admin/events/" + event.id + "?tab=registrations"}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-lane px-4 text-sm font-semibold transition hover:bg-lane/50"
                      >
                        <RotateCcw className="size-4" aria-hidden="true" />
                        ล้างการค้นหา
                      </Link>
                    )}
                  </form>
                </Card>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold">รายชื่อผู้สมัครงานนี้</p>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-mono text-sm text-ink/45 tnum">
                      แสดง {filteredRegList.length} จาก {regList.length} คน
                    </span>
                    <LinkButton href={registrationExportHref} icon="download">
                      Export CSV
                    </LinkButton>
                  </div>
                </div>

                {regList.length === 0 ? (
                  <Card className="text-center text-ink/50">ยังไม่มีผู้สมัครในงานนี้</Card>
                ) : filteredRegList.length === 0 ? (
                  <Card className="text-center text-ink/50">
                    ไม่พบผู้สมัครที่ตรงกับเงื่อนไข
                  </Card>
                ) : (
                  <Card className="overflow-hidden p-0 sm:p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[1340px] border-collapse text-left text-sm">
                        <caption className="sr-only">
                          รายชื่อผู้สมัครเฉพาะงานตามเงื่อนไขที่เลือก
                        </caption>
                        <thead className="bg-lane/35 text-xs text-ink/55">
                          <tr>
                            <th scope="col" className="px-4 py-3 font-semibold">ผู้สมัคร</th>
                            <th scope="col" className="px-4 py-3 font-semibold">แพ็กเกจ</th>
                            <th scope="col" className="px-4 py-3 font-semibold">BIB</th>
                            <th scope="col" className="px-4 py-3 font-semibold">วันที่สมัคร</th>
                            <th scope="col" className="px-4 py-3 font-semibold">ที่อยู่จัดส่ง</th>
                            <th scope="col" className="px-4 py-3 font-semibold">สถานะ</th>
                            <th scope="col" className="px-4 py-3 font-semibold">สถานะการวิ่ง</th>
                            <th scope="col" className="px-4 py-3 font-semibold">การจัดการ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-lane">
                          {filteredRegList.map((registration) => {
                            const address = registration.shipping_address;
                            const approvedDistanceKmForRegistration =
                              approvedDistanceByRegistration.get(registration.id) ?? 0;
                            const distanceLevelProgress = getEventDistanceLevelProgress(
                              distanceLevels,
                              approvedDistanceKmForRegistration,
                            );
                            const runProgress = getRegistrationRunProgress({
                              registrationStatus: registration.status,
                              approvedDistanceKm: approvedDistanceKmForRegistration,
                              targetDistanceKm:
                                event.event_mode === "distance_levels"
                                  ? distanceLevelProgress.finalLevel?.target_distance_km ?? 0
                                  : registration.packages?.target_distance_km ?? 0,
                            });
                            return (
                              <tr
                                key={registration.id}
                                className="align-top transition hover:bg-lane/20"
                              >
                                <td className="px-4 py-4">
                                  <p className="font-semibold text-ink">
                                    {registration.users?.name ||
                                      registration.users?.email ||
                                      "ไม่ทราบชื่อ"}
                                  </p>
                                  {registration.users?.name && registration.users.email && (
                                    <p className="mt-1 text-xs text-ink/50">
                                      {registration.users.email}
                                    </p>
                                  )}
                                </td>
                                <td className="px-4 py-4">
                                  <p className="font-medium text-ink/80">
                                    {registration.packages?.name ?? "ไม่พบข้อมูลแพ็กเกจ"}
                                  </p>
                                </td>
                                <td className="px-4 py-4 font-mono font-bold text-primary-dark tnum">
                                  {registration.bib_number ? (
                                    "BIB " + registration.bib_number
                                  ) : (
                                    <span className="font-sans font-normal text-ink/35">
                                      รอออก BIB
                                    </span>
                                  )}
                                </td>
                                <td className="whitespace-nowrap px-4 py-4">
                                  <p className="font-mono text-sm tnum">
                                    {new Date(registration.registered_at).toLocaleDateString(
                                      "th-TH",
                                      { timeZone: "Asia/Bangkok" },
                                    )}
                                  </p>
                                  <p className="mt-1 font-mono text-xs text-ink/45 tnum">
                                    {new Date(registration.registered_at).toLocaleTimeString(
                                      "th-TH",
                                      {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                        timeZone: "Asia/Bangkok",
                                      },
                                    )} น.
                                  </p>
                                </td>
                                <td className="max-w-[300px] px-4 py-4 text-xs leading-5 text-ink/60">
                                  {address ? (
                                    <>
                                      <p className="font-medium text-ink/75">
                                        {address.recipient} · {address.phone}
                                      </p>
                                      <p className="mt-1">
                                        {address.address} {address.province} {address.postal_code}
                                      </p>
                                    </>
                                  ) : (
                                    <span className="text-ink/35">ไม่มีข้อมูลที่อยู่</span>
                                  )}
                                </td>
                                <td className="px-4 py-4">
                                  <Badge className={registrationStatusClass[registration.status]}>
                                    {registrationStatusLabel[registration.status] ??
                                      registration.status}
                                  </Badge>
                                </td>
                                <td className="px-4 py-4">
                                  <Badge className={registrationRunStatusClass[runProgress.status]}>
                                    {registrationRunStatusLabel[runProgress.status]}
                                  </Badge>
                                  <p className="mt-1 whitespace-nowrap font-mono text-xs text-ink/50 tnum">
                                    {runProgress.approvedDistanceKm.toLocaleString("th-TH", {
                                      maximumFractionDigits: 2,
                                    })}{" "}
                                    /{" "}
                                    {runProgress.targetDistanceKm.toLocaleString("th-TH", {
                                      maximumFractionDigits: 2,
                                    })}{" "}
                                    กม.
                                  </p>
                                  {event.event_mode === "distance_levels" && (
                                    <div className="mt-1 max-w-64 text-xs leading-5 text-ink/55">
                                      <p>
                                        ระดับปัจจุบัน: {distanceLevelProgress.currentLevel?.name ?? "ยังไม่ผ่านระดับแรก"}
                                      </p>
                                      {distanceLevelProgress.nextLevel ? (
                                        <p>
                                          เหลือ {distanceLevelProgress.remainingDistanceKm.toLocaleString("th-TH", {
                                            maximumFractionDigits: 2,
                                          })} กม. ถึง {distanceLevelProgress.nextLevel.name}
                                        </p>
                                      ) : distanceLevelProgress.completed ? (
                                        <p className="font-semibold text-green-700">ผ่านครบทุกระดับแล้ว</p>
                                      ) : null}
                                    </div>
                                  )}
                                </td>
                                <td className="px-4 py-4">
                                  {registration.status === "pending" ? (
                                    <form action={manuallyApproveRegistration}>
                                      <input
                                        type="hidden"
                                        name="registration_id"
                                        value={registration.id}
                                      />
                                      <input type="hidden" name="event_id" value={event.id} />
                                      <Button
                                        type="submit"
                                        icon="userCheck"
                                        className="min-h-9 whitespace-nowrap px-3 py-1.5 text-xs"
                                      >
                                        ยืนยันและออก BIB
                                      </Button>
                                    </form>
                                  ) : (
                                    <span className="text-xs text-ink/35">ไม่มีรายการ</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                )}
              </div>
            ),
          },
          {
            id: "submissions",
            label: "ตรวจผลวิ่ง",
            content: <EventSubmissionsTab eventId={event.id} searchParams={sp} />,
          },
          ...(isPaidEvent ? [
            {
              id: "payments",
              label: "การชำระเงิน",
              content: <EventPaymentsTab eventId={event.id} searchParams={sp} />,
            },
            {
              id: "shipments",
              label: "จัดส่งเหรียญ",
              content: <EventShipmentsTab eventId={event.id} searchParams={sp} />,
            },
          ] : []),
        ]}
      />
    </div>
  );
}
