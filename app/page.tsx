import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, Badge, LinkButton, Input, Select } from "@/components/ui";
import { HeroCarousel } from "@/components/hero-carousel";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 9;

type PackageRow = {
  id: string;
  name: string;
  target_distance_km: number;
  price: number;
  has_physical_medal: boolean;
};
type EventRow = {
  id: string;
  title: string;
  description: string | null;
  cover_image: string | null;
  pricing: "free" | "paid";
  start_date: string;
  end_date: string;
  packages: PackageRow[];
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; pricing?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const q = (sp.q ?? "").trim();
  const pricingFilter = sp.pricing ?? "";
  const offset = (page - 1) * PAGE_SIZE;

  let query = supabase
    .from("events")
    .select(
      "id, title, description, cover_image, pricing, start_date, end_date, packages(id, name, target_distance_km, price, has_physical_medal)",
      { count: "exact" },
    )
    .eq("status", "open")
    .order("start_date", { ascending: true })
    .range(offset, offset + PAGE_SIZE - 1);

  if (q) query = query.ilike("title", `%${q}%`);
  if (pricingFilter) query = query.eq("pricing", pricingFilter);

  const { data: events, count: filteredCount } = await query;
  const list = (events ?? []) as EventRow[];
  const totalPages = Math.max(1, Math.ceil((filteredCount ?? 0) / PAGE_SIZE));

  const buildPageHref = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (pricingFilter) params.set("pricing", pricingFilter);
    params.set("page", String(p));
    return `/?${params.toString()}#events`;
  };

  const { data: banners } = await supabase
    .from("hero_banners")
    .select("id, image_url, title, subtitle, link_url")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  return (
    <div className="space-y-12">
      {/* Hero — thesis: ระยะทางคือหัวใจ (ทับอยู่บน banner slide ที่จัดการได้จาก admin) */}
      {/* -mt-8 หักล้าง py-8 ของ <main> ใน layout — ให้ banner ชิดกับ header พอดี ไม่มีช่องว่าง */}
      <section className="-mt-8">
        <HeroCarousel slides={banners ?? []}>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
            Run · Walk · Collect
          </p>
          <h1 className="mt-3 max-w-2xl font-display text-4xl font-bold leading-tight tracking-tight text-paper sm:text-5xl">
            วิ่งที่ไหน เมื่อไหร่ก็ได้
            <br />
            <span className="text-primary">เก็บทุกกิโลเมตร</span> ให้เป็นเหรียญ
          </h1>
          <p className="mt-4 max-w-xl text-paper/70">
            สมัครงาน เชื่อม Strava หรืออัปโหลดผลเอง ระบบรวมระยะให้อัตโนมัติ
            ครบเป้าเมื่อไหร่ ปลดล็อกเหรียญเมื่อนั้น
          </p>
          <div className="mt-6 flex gap-3">
            <LinkButton href="#events" variant="primary">
              ดูงานวิ่งทั้งหมด
            </LinkButton>
            <LinkButton
              href="/signup"
              className="border border-paper/40 bg-transparent text-paper hover:bg-paper/10"
            >
              สมัครสมาชิก
            </LinkButton>
          </div>
        </HeroCarousel>
      </section>

      {/* Events */}
      <section id="events" className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-2xl font-bold">งานที่เปิดรับสมัคร</h2>
          <span className="font-mono text-sm text-ink/40 tnum">
            {filteredCount ?? 0} งาน
          </span>
        </div>

        <Card>
          <form method="get" className="flex flex-col gap-4 lg:flex-row lg:items-end">
            <div className="flex-1">
              <label className="mb-1.5 block text-sm font-medium text-ink/70">ค้นหา</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/40">
                  🔍
                </span>
                <Input name="q" defaultValue={q} placeholder="ชื่องาน..." className="pl-9" />
              </div>
            </div>
            <div className="w-full lg:w-48">
              <label className="mb-1.5 block text-sm font-medium text-ink/70">ประเภทค่าสมัคร</label>
              <Select name="pricing" defaultValue={pricingFilter}>
                <option value="">ทั้งหมด</option>
                <option value="free">ฟรี</option>
                <option value="paid">มีค่าสมัคร</option>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-ink transition hover:bg-primary-dark"
              >
                กรอง
              </button>
              {(q || pricingFilter) && (
                <Link href="/#events" className="text-sm font-medium text-ink/50 hover:text-ink">
                  ล้าง
                </Link>
              )}
            </div>
          </form>
        </Card>

        {list.length === 0 ? (
          <Card className="text-center text-ink/50">
            {q ? "ไม่พบงานที่ตรงกับเงื่อนไข" : "ยังไม่มีงานที่เปิดรับสมัคร — รัน seed.sql เพื่อเพิ่มงานตัวอย่าง"}
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((ev) => {
                const hasPackages = ev.packages.length > 0;
                const minKm = hasPackages
                  ? Math.min(...ev.packages.map((p) => p.target_distance_km))
                  : 0;
                const maxKm = hasPackages
                  ? Math.max(...ev.packages.map((p) => p.target_distance_km))
                  : 0;
                return (
                  <Link key={ev.id} href={`/events/${ev.id}`} className="group">
                    <Card className="flex h-full flex-col overflow-hidden p-0 hover:border-primary/40">
                      <div className="relative h-44 w-full overflow-hidden bg-lane">
                        {ev.cover_image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={ev.cover_image}
                            alt=""
                            className="h-full w-full object-cover transition group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-4xl">
                            🏃
                          </div>
                        )}
                        <Badge
                          className={`absolute right-3 top-3 ${
                            ev.pricing === "free"
                              ? "bg-primary-soft text-primary-dark"
                              : "bg-medal-soft text-medal"
                          }`}
                        >
                          {ev.pricing === "free" ? "ฟรี" : "มีค่าสมัคร"}
                        </Badge>
                      </div>
                      <div className="flex flex-1 flex-col gap-2 p-5">
                        <h3 className="line-clamp-2 font-display font-bold">{ev.title}</h3>
                        <p className="flex flex-wrap items-center gap-1.5 font-mono text-xs text-accent tnum">
                          <span>🕐 {formatDate(ev.start_date)}</span>
                          {hasPackages && (
                            <span>
                              · {minKm === maxKm ? `${minKm}` : `${minKm}–${maxKm}`} km ·{" "}
                              {ev.packages.length} แพ็กเกจ
                            </span>
                          )}
                        </p>
                        {ev.description && (
                          <p className="line-clamp-2 text-sm text-muted">{ev.description}</p>
                        )}
                        <span className="mt-auto inline-flex w-fit items-center rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-ink transition group-hover:bg-primary-dark">
                          ดูรายละเอียด →
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
                  className={`rounded-lg px-3 py-2 text-sm font-medium ${
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
                      p === page ? "bg-primary text-ink" : "text-muted hover:bg-lane/60"
                    }`}
                  >
                    {p}
                  </Link>
                ))}
                <Link
                  href={buildPageHref(Math.min(totalPages, page + 1))}
                  className={`rounded-lg px-3 py-2 text-sm font-medium ${
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
      </section>
    </div>
  );
}
