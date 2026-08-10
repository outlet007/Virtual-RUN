import Link from "next/link";
import { redirect } from "next/navigation";
import { Footprints, PersonStanding, RotateCcw, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Badge, Button, Card, HeadingIcon, Input, Label, Select } from "@/components/ui";
import { formatKm } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Sub = {
  id: string;
  distance_km: number;
  status: string;
  activity_type: string;
  activity_date: string;
  source: string;
  registrations: { events: { title: string } | null } | null;
};

const statusLabels: Record<string, string> = {
  approved: "อนุมัติแล้ว",
  flagged: "ต้องตรวจสอบ",
  pending: "รอตรวจสอบ",
  rejected: "ปฏิเสธ",
};

const activityLabels: Record<string, string> = {
  run: "วิ่ง",
  walk: "เดิน",
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
  const supabase = await createClient();
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
      "id, distance_km, status, activity_type, activity_date, source, registrations(events(title))",
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
    const sourceLabel = submission.source === "strava" ? "Strava" : "อัปโหลดเอง";

    return [
      submission.registrations?.events?.title,
      submission.distance_km,
      `${formatKm(Number(submission.distance_km))} km`,
      dateLabel,
      sourceLabel,
      statusLabels[submission.status],
      activityLabels[submission.activity_type],
    ].some((value) => normalizeSearchValue(value).includes(searchNeedle));
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-xl font-bold">
            <HeadingIcon name="history" />
            ประวัติการเข้าร่วม
          </h2>
          <p className="mt-1 text-sm text-muted">
            ผลวิ่งที่บันทึกไว้ทั้งหมด ทั้งการอัปโหลดเองและการซิงก์จาก Strava
          </p>
        </div>
        <span className="font-mono text-sm text-ink/40 tnum">
          {subs.length.toLocaleString("th-TH")} รายการ
        </span>
      </div>

      <Card>
        <form method="get" className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_190px_190px_auto] lg:items-end">
            <div>
              <Label htmlFor="history-search">ค้นหาประวัติ</Label>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink/40"
                  aria-hidden="true"
                />
                <Input
                  id="history-search"
                  name="q"
                  defaultValue={q}
                  placeholder="ชื่องาน ระยะทาง วันที่ หรือแหล่งข้อมูล"
                  className="pl-9"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="history-status">สถานะผล</Label>
              <Select id="history-status" name="status" defaultValue={status}>
                <option value="all">ทุกสถานะ</option>
                <option value="approved">อนุมัติแล้ว</option>
                <option value="pending">รอตรวจสอบ</option>
                <option value="flagged">ต้องตรวจสอบ</option>
                <option value="rejected">ปฏิเสธ</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="history-activity-type">ประเภทกิจกรรม</Label>
              <Select id="history-activity-type" name="activityType" defaultValue={activityType}>
                <option value="all">ทุกประเภท</option>
                <option value="run">วิ่ง</option>
                <option value="walk">เดิน</option>
              </Select>
            </div>
            <Button type="submit" className="w-full lg:w-auto" icon="search">
              ค้นหา
            </Button>
          </div>

          {(q || status !== "all" || activityType !== "all") && (
            <Link
              href="/dashboard/history"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-lane px-4 py-2 text-sm font-semibold transition hover:bg-lane/50"
            >
              <RotateCcw className="size-4" aria-hidden="true" />
              ล้างการค้นหา
            </Link>
          )}
        </form>
      </Card>

      {subs.length === 0 ? (
        <Card className="text-center text-ink/50">
          {allSubs.length === 0
            ? "ยังไม่มีประวัติผลวิ่ง"
            : "ไม่พบประวัติที่ตรงกับเงื่อนไข"}
        </Card>
      ) : (
        <Card className="overflow-hidden p-0 sm:p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] border-collapse text-left text-sm">
              <caption className="sr-only">รายการประวัติการเข้าร่วมของฉัน</caption>
              <thead className="bg-lane/35 text-xs text-ink/55">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">งานวิ่ง</th>
                  <th scope="col" className="px-4 py-3 font-semibold">กิจกรรม</th>
                  <th scope="col" className="px-4 py-3 font-semibold">ระยะทาง</th>
                  <th scope="col" className="px-4 py-3 font-semibold">วันที่กิจกรรม</th>
                  <th scope="col" className="px-4 py-3 font-semibold">แหล่งข้อมูล</th>
                  <th scope="col" className="px-4 py-3 font-semibold">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-lane">
                {subs.map((submission) => (
                  <tr key={submission.id} className="transition hover:bg-lane/20">
                    <td className="max-w-[300px] px-4 py-4 font-semibold text-ink">
                      <p className="truncate">
                        {submission.registrations?.events?.title ?? "ไม่ระบุชื่องาน"}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center gap-2 text-ink/70">
                        {submission.activity_type === "walk" ? (
                          <PersonStanding className="size-4" aria-hidden="true" />
                        ) : (
                          <Footprints className="size-4" aria-hidden="true" />
                        )}
                        {activityLabels[submission.activity_type] ?? "วิ่ง"}
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
                      {submission.source === "strava" ? "Strava" : "อัปโหลดเอง"}
                    </td>
                    <td className="px-4 py-4">
                      <Badge className={statusBadgeClass(submission.status)}>
                        {statusLabels[submission.status] ?? "รอตรวจสอบ"}
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
