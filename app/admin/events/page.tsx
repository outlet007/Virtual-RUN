import Link from "next/link";
import { Search, Footprints, CalendarDays, ChevronRight, ChevronLeft, RotateCcw } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, Badge, HeadingIcon, Input, Select } from "@/components/ui";
import { formatDate, stripHtml } from "@/lib/utils";
import { getBangkokDate } from "@/lib/event-registration";
import { CreateEventModal } from "@/components/admin/create-event-modal";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 9;

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

export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    q?: string;
    status?: string;
    event_deleted?: string;
    create?: string;
    error?: string;
  }>;
}) {
  const sp = await searchParams;
  const db = createAdminClient();
  const today = getBangkokDate();
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const q = (sp.q ?? "").trim();
  const statusFilter = sp.status ?? "";
  const offset = (page - 1) * PAGE_SIZE;

  const [{ count: totalEventsCount }, { count: totalRegistrationsCount }, { count: totalConfirmedCount }] =
    await Promise.all([
      db.from("events").select("id", { count: "exact", head: true }),
      db.from("registrations").select("id", { count: "exact", head: true }),
      db
        .from("registrations")
        .select("id", { count: "exact", head: true })
        .eq("status", "confirmed"),
    ]);

  let query = db
    .from("events")
    .select(
      "id, title, description, cover_image, status, start_date, end_date, registrations(id, status)",
      { count: "exact" },
    )
    .order("start_date", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (q) query = query.ilike("title", `%${q}%`);
  if (statusFilter) query = query.eq("status", statusFilter);

  const { data: events, count: filteredCount } = await query;
  const list = events ?? [];
  const totalPages = Math.max(1, Math.ceil((filteredCount ?? 0) / PAGE_SIZE));

  const buildPageHref = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (statusFilter) params.set("status", statusFilter);
    params.set("page", String(p));
    return `/admin/events?${params.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="flex items-center gap-2 font-display text-xl font-bold">
          <HeadingIcon name="calendar" />
          งานทั้งหมด
        </h2>
        <CreateEventModal initialOpen={sp.create === "1"} error={sp.error} />
      </div>

      {sp.event_deleted && (
        <div className="rounded-xl bg-primary-soft px-4 py-3 text-sm text-primary-dark">
          ลบงานแล้ว
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card>
          <p className="text-xs uppercase tracking-wider text-ink/40">งานทั้งหมด</p>
          <p className="mt-1 font-mono text-2xl font-bold tnum">{totalEventsCount ?? 0}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wider text-ink/40">ผู้สมัครทั้งหมด</p>
          <p className="mt-1 font-mono text-2xl font-bold tnum">{totalRegistrationsCount ?? 0}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wider text-ink/40">ยืนยันแล้ว</p>
          <p className="mt-1 font-mono text-2xl font-bold tnum">{totalConfirmedCount ?? 0}</p>
        </Card>
      </div>

      <Card>
        <form method="get" className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <div className="flex-1">
            <label className="mb-1.5 block text-sm font-medium text-ink/70">ค้นหา</label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/40">
                <Search className="h-4 w-4" />
              </span>
              <Input
                name="q"
                defaultValue={q}
                placeholder="ชื่องาน..."
                className="pl-9"
              />
            </div>
          </div>
          <div className="w-full lg:w-48">
            <label className="mb-1.5 block text-sm font-medium text-ink/70">สถานะ</label>
            <Select name="status" defaultValue={statusFilter}>
              <option value="">ทั้งหมด</option>
              <option value="draft">ร่าง</option>
              <option value="open">เปิดรับสมัคร</option>
              <option value="closed">ปิดรับสมัคร</option>
            </Select>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-ink transition hover:bg-primary-hover"
            >
              <Search className="size-4" aria-hidden="true" />
              ค้นหา
            </button>
            {(q || statusFilter) && (
              <Link href="/admin/events" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink/50 hover:text-ink">
                ล้าง
              </Link>
            )}
          </div>
        </form>
      </Card>

      {list.length === 0 ? (
        <Card className="text-center text-ink/50">ไม่พบงานที่ตรงกับเงื่อนไข</Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((ev) => {
              const confirmedCount = ev.registrations.filter((r) => r.status === "confirmed").length;
              const isPast = ev.end_date < today;
              return (
                <Link key={ev.id} href={`/admin/events/${ev.id}`} className="group">
                  <Card className="flex h-full flex-col overflow-hidden p-0 sm:p-0 hover:border-primary/40">
                    <div className="relative h-44 w-full overflow-hidden bg-lane">
                      {ev.cover_image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={ev.cover_image}
                          alt=""
                          className={`h-full w-full object-cover transition group-hover:scale-105 ${isPast ? "grayscale" : ""}`}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-ink/30">
                          <Footprints className="h-10 w-10" />
                        </div>
                      )}
                      <Badge className={`absolute right-3 top-3 ${statusClass[ev.status]}`}>
                        {statusLabel[ev.status]}
                      </Badge>
                    </div>
                    <div className="flex flex-1 flex-col gap-2 p-5">
                      <h3 className="flex items-start gap-2 font-display font-bold">
                        <HeadingIcon name="calendar" className="mt-0.5 size-4" />
                        <span className="line-clamp-2">{ev.title}</span>
                      </h3>
                      <p className="flex flex-wrap items-center gap-1.5 font-mono text-xs text-accent tnum">
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="h-3.5 w-3.5" /> {formatDate(ev.start_date)}
                        </span>
                        <span>
                          · {ev.registrations.length} ผู้สมัคร ({confirmedCount} ยืนยันแล้ว)
                        </span>
                      </p>
                      {ev.description && (
                        <p className="line-clamp-2 text-sm text-muted">{stripHtml(ev.description)}</p>
                      )}
                      <span className="mt-auto inline-flex w-fit items-center gap-1 rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-ink transition group-hover:bg-primary-hover">
                        <ChevronRight className="h-4 w-4" aria-hidden="true" /> ดูรายละเอียด
                      </span>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <Link
                href={buildPageHref(Math.max(1, page - 1))}
                className={`inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium ${
                  page === 1 ? "pointer-events-none text-ink/30" : "text-muted hover:bg-lane/60"
                }`}
              >
                ← ก่อนหน้า
              </Link>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <Link
                  key={p}
                  href={buildPageHref(p)}
                  className={`rounded-lg px-3 py-2 text-sm font-medium tnum ${
                    p === page
                      ? "bg-primary text-ink hover:bg-primary-hover"
                      : "text-muted hover:bg-lane/60"
                  }`}
                >
                  {p}
                </Link>
              ))}
              <Link
                href={buildPageHref(Math.min(totalPages, page + 1))}
                className={`inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium ${
                  page === totalPages
                    ? "pointer-events-none text-ink/30"
                    : "text-muted hover:bg-lane/60"
                }`}
              >
                ถัดไป →
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
