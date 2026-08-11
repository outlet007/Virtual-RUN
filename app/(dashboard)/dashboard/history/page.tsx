import Link from "next/link";
import { redirect } from "next/navigation";
import { Footprints, PersonStanding, RotateCcw, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Badge, Button, Card, HeadingIcon, Input, Label, Select } from "@/components/ui";
import { formatKm } from "@/lib/utils";
import { getLocale } from "@/lib/i18n/server";
import { pickLocalized, tx } from "@/lib/i18n/shared";

export const dynamic = "force-dynamic";

type Sub = {
  id: string;
  distance_km: number;
  status: string;
  activity_type: string;
  activity_date: string;
  source: string;
  registrations: { events: { title: string; title_en: string | null } | null } | null;
};

const statusLabels: Record<string, { th: string; en: string }> = {
  approved: { th: "อนุมัติแล้ว", en: "Approved" },
  flagged: { th: "ต้องตรวจสอบ", en: "Needs Review" },
  pending: { th: "รอตรวจสอบ", en: "Pending Review" },
  rejected: { th: "ปฏิเสธ", en: "Rejected" },
};

const activityLabels: Record<string, { th: string; en: string }> = {
  run: { th: "วิ่ง", en: "Run" },
  walk: { th: "เดิน", en: "Walk" },
};

function normalizeSearchValue(value: unknown) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase("th-TH")
    .trim();
}

function statusBadgeClass(status: string) {
  if (status === "approved") return "bg-primary-soft text-primary-dark";
  if (status === "rejected") return "bg-red-50 text-red-600";
  if (status === "flagged") return "bg-orange-50 text-orange-700";
  return "bg-medal-soft text-medal";
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; activityType?: string }>;
}) {
  const [supabase, locale] = await Promise.all([createClient(), getLocale()]);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const status = ["approved", "flagged", "pending", "rejected"].includes(sp.status ?? "")
    ? sp.status!
    : "all";
  const activityType = ["run", "walk"].includes(sp.activityType ?? "")
    ? sp.activityType!
    : "all";

  const { data: subsRaw } = await supabase
    .from("submissions")
    .select(
      "id, distance_km, status, activity_type, activity_date, source, registrations(events(title, title_en))",
    )
    .eq("user_id", user.id)
    .order("activity_date", { ascending: false });

  const allSubs = (subsRaw ?? []) as unknown as Sub[];
  const searchNeedle = normalizeSearchValue(q);
  const subs = allSubs.filter((submission) => {
    if (status !== "all" && submission.status !== status) return false;
    if (activityType !== "all" && submission.activity_type !== activityType) return false;
    if (!searchNeedle) return true;

    const dateLabel = new Date(submission.activity_date).toLocaleDateString("th-TH", {
      timeZone: "Asia/Bangkok",
    });
    const sourceLabel = submission.source === "strava" ? "Strava" : tx(locale, "อัปโหลดเอง", "Manual upload");

    return [
      submission.registrations?.events ? pickLocalized(locale, submission.registrations.events.title, submission.registrations.events.title_en) : null,
      submission.distance_km,
      `${formatKm(Number(submission.distance_km))} km`,
      dateLabel,
      sourceLabel,
      statusLabels[submission.status]?.[locale],
      activityLabels[submission.activity_type]?.[locale],
    ].some((value) => normalizeSearchValue(value).includes(searchNeedle));
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-xl font-bold">
            <HeadingIcon name="history" />
            {tx(locale, "ประวัติการเข้าร่วม", "Activity history")}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {tx(locale, "ผลวิ่งที่บันทึกไว้ทั้งหมด ทั้งการอัปโหลดเองและการซิงก์จาก Strava", "All submitted activities, including manual uploads and Strava syncs")}
          </p>
        </div>
        <span className="font-mono text-sm text-ink/40 tnum">
          {subs.length.toLocaleString(locale === "en" ? "en-US" : "th-TH")} {tx(locale, "รายการ", "records")}
        </span>
      </div>

      <Card>
        <form method="get" className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_190px_190px_auto] lg:items-end">
            <div>
              <Label htmlFor="history-search">{tx(locale, "ค้นหาประวัติ", "Search history")}</Label>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink/40"
                  aria-hidden="true"
                />
                <Input
                  id="history-search"
                  name="q"
                  defaultValue={q}
                  placeholder={tx(locale, "ชื่องาน ระยะทาง วันที่ หรือแหล่งข้อมูล", "Event, distance, date, or source")}
                  className="pl-9"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="history-status">{tx(locale, "สถานะผล", "Status")}</Label>
              <Select id="history-status" name="status" defaultValue={status}>
                <option value="all">{tx(locale, "ทุกสถานะ", "All statuses")}</option>
                <option value="approved">{statusLabels.approved[locale]}</option>
                <option value="pending">{statusLabels.pending[locale]}</option>
                <option value="flagged">{statusLabels.flagged[locale]}</option>
                <option value="rejected">{statusLabels.rejected[locale]}</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="history-activity-type">{tx(locale, "ประเภทกิจกรรม", "Activity type")}</Label>
              <Select id="history-activity-type" name="activityType" defaultValue={activityType}>
                <option value="all">{tx(locale, "ทุกประเภท", "All types")}</option>
                <option value="run">{activityLabels.run[locale]}</option>
                <option value="walk">{activityLabels.walk[locale]}</option>
              </Select>
            </div>
            <Button type="submit" className="w-full lg:w-auto" icon="search">
              {tx(locale, "ค้นหา", "Search")}
            </Button>
          </div>

          {(q || status !== "all" || activityType !== "all") && (
            <Link
              href="/dashboard/history"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-lane px-4 py-2 text-sm font-semibold transition hover:bg-lane/50"
            >
              <RotateCcw className="size-4" aria-hidden="true" />
              {tx(locale, "ล้างการค้นหา", "Clear search")}
            </Link>
          )}
        </form>
      </Card>

      {subs.length === 0 ? (
        <Card className="text-center text-ink/50">
          {allSubs.length === 0
            ? tx(locale, "ยังไม่มีประวัติผลวิ่ง", "No activity history yet")
            : tx(locale, "ไม่พบประวัติที่ตรงกับเงื่อนไข", "No matching history")}
        </Card>
      ) : (
        <Card className="overflow-hidden p-0 sm:p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] border-collapse text-left text-sm">
              <caption className="sr-only">{tx(locale, "รายการประวัติการเข้าร่วมของฉัน", "My activity history")}</caption>
              <thead className="bg-lane/35 text-xs text-ink/55">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">{tx(locale, "งานวิ่ง", "Event")}</th>
                  <th scope="col" className="px-4 py-3 font-semibold">{tx(locale, "กิจกรรม", "Activity")}</th>
                  <th scope="col" className="px-4 py-3 font-semibold">{tx(locale, "ระยะทาง", "Distance")}</th>
                  <th scope="col" className="px-4 py-3 font-semibold">{tx(locale, "วันที่กิจกรรม", "Activity date")}</th>
                  <th scope="col" className="px-4 py-3 font-semibold">{tx(locale, "แหล่งข้อมูล", "Source")}</th>
                  <th scope="col" className="px-4 py-3 font-semibold">{tx(locale, "สถานะ", "Status")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-lane">
                {subs.map((submission) => (
                  <tr key={submission.id} className="transition hover:bg-lane/20">
                    <td className="max-w-[300px] px-4 py-4 font-semibold text-ink">
                      <p className="truncate">
                        {submission.registrations?.events
                          ? pickLocalized(locale, submission.registrations.events.title, submission.registrations.events.title_en)
                          : tx(locale, "ไม่ระบุชื่องาน", "Unnamed event")}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center gap-2 text-ink/70">
                        {submission.activity_type === "walk" ? (
                          <PersonStanding className="size-4" aria-hidden="true" />
                        ) : (
                          <Footprints className="size-4" aria-hidden="true" />
                        )}
                        {activityLabels[submission.activity_type]?.[locale] ?? tx(locale, "วิ่ง", "Run")}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 font-mono font-semibold tnum">
                      {formatKm(Number(submission.distance_km))} km
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 font-mono text-ink/65 tnum">
                      {new Date(submission.activity_date).toLocaleDateString("th-TH", {
                        timeZone: "Asia/Bangkok",
                      })}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-ink/65">
                      {submission.source === "strava" ? "Strava" : tx(locale, "อัปโหลดเอง", "Manual upload")}
                    </td>
                    <td className="px-4 py-4">
                      <Badge className={statusBadgeClass(submission.status)}>
                        {statusLabels[submission.status]?.[locale] ?? tx(locale, "รอตรวจสอบ", "Pending review")}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
