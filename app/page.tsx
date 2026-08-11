import Link from "next/link";
import { Search, Footprints, CalendarDays, Road, ChevronRight, ChevronLeft, RotateCcw } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, Badge, HeadingIcon, LinkButton, Input, Select } from "@/components/ui";
import { HeroCarousel } from "@/components/hero-carousel";
import { CategoryBadge } from "@/components/articles/category-badge";
import { formatDate, stripHtml } from "@/lib/utils";
import { getLocale } from "@/lib/i18n/server";
import { formatLocalizedDate, pickLocalized, tx } from "@/lib/i18n/shared";
import { getSystemSettings } from "@/lib/system-settings";
import { getHeroSignupHref } from "@/lib/hero-banner";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 9;

type PackageRow = {
  id: string;
  name: string;
  name_en: string | null;
  target_distance_km: number;
  price: number;
  has_physical_medal: boolean;
};
type EventRow = {
  id: string;
  title: string;
  title_en: string | null;
  description: string | null;
  description_en: string | null;
  cover_image: string | null;
  pricing: "free" | "paid";
  start_date: string;
  end_date: string;
  packages: PackageRow[];
};
type HomeArticleRow = {
  id: string;
  title: string;
  title_en: string | null;
  slug: string;
  excerpt: string | null;
  excerpt_en: string | null;
  banner_image_url: string | null;
  banner_position_x: number;
  banner_position_y: number;
  published_at: string;
  category:
    | {
        name: string;
        name_en: string | null;
        slug: string;
        badge_background_color: string;
        badge_text_color: string;
      }
    | {
        name: string;
        name_en: string | null;
        slug: string;
        badge_background_color: string;
        badge_text_color: string;
      }[]
    | null;
};

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; pricing?: string }>;
}) {
  const sp = await searchParams;
  const [supabase, locale, settings] = await Promise.all([
    createClient(),
    getLocale(),
    getSystemSettings(),
  ]);
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const q = (sp.q ?? "").trim();
  const pricingFilter = sp.pricing ?? "";
  const offset = (page - 1) * PAGE_SIZE;
  const bangkokDateParts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const datePart = (type: "year" | "month" | "day") =>
    bangkokDateParts.find((part) => part.type === type)?.value ?? "";
  const today = `${datePart("year")}-${datePart("month")}-${datePart("day")}`;

  let query = supabase
    .from("events")
    .select(
      "id, title, title_en, description, description_en, cover_image, pricing, start_date, end_date, packages(id, name, name_en, target_distance_km, price, has_physical_medal)",
      { count: "exact" },
    )
    .eq("status", "open")
    .gte("end_date", today)
    .order("start_date", { ascending: true })
    .range(offset, offset + PAGE_SIZE - 1);

  if (q) query = query.or("title.ilike.%" + q + "%,title_en.ilike.%" + q + "%");
  if (pricingFilter) query = query.eq("pricing", pricingFilter);

  const { data: events, count: filteredCount } = await query;
  const list = (events ?? []) as EventRow[];
  const totalPages = Math.max(1, Math.ceil((filteredCount ?? 0) / PAGE_SIZE));

  let pastQuery = supabase
    .from("events")
    .select(
      "id, title, title_en, description, description_en, cover_image, pricing, start_date, end_date, packages(id, name, name_en, target_distance_km, price, has_physical_medal)",
      { count: "exact" },
    )
    .in("status", ["open", "closed"])
    .lt("end_date", today)
    .order("end_date", { ascending: false });

  if (q) pastQuery = pastQuery.or("title.ilike.%" + q + "%,title_en.ilike.%" + q + "%");
  if (pricingFilter) pastQuery = pastQuery.eq("pricing", pricingFilter);

  const { data: pastEvents, count: pastCount } = await pastQuery;
  const pastList = (pastEvents ?? []) as EventRow[];

  const buildPageHref = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (pricingFilter) params.set("pricing", pricingFilter);
    params.set("page", String(p));
    return `/?${params.toString()}#events`;
  };

  const { data: banners } = await supabase
    .from("hero_banners")
    .select("id, image_url, kicker, kicker_en, title, title_en, highlight, highlight_en, title_suffix, title_suffix_en, subtitle, subtitle_en, link_url, position_x, position_y")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  const { data: latestArticleRows } = await supabase
    .from("content_articles")
    .select(
      "id, title, title_en, slug, excerpt, excerpt_en, banner_image_url, banner_position_x, banner_position_y, published_at, category:content_categories(name, name_en, slug, badge_background_color, badge_text_color)",
    )
    .eq("status", "published")
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false })
    .limit(3);
  const latestArticles = (latestArticleRows ?? []) as unknown as HomeArticleRow[];
  const localizedBanners = (banners ?? []).map((banner) => ({
    ...banner,
    kicker: pickLocalized(locale, banner.kicker, banner.kicker_en),
    title: pickLocalized(locale, banner.title, banner.title_en),
    highlight: pickLocalized(locale, banner.highlight, banner.highlight_en),
    title_suffix: pickLocalized(locale, banner.title_suffix, banner.title_suffix_en),
    subtitle: pickLocalized(locale, banner.subtitle, banner.subtitle_en),
  }));
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="space-y-12">
      {/* Hero — thesis: ระยะทางคือหัวใจ (ทับอยู่บน banner slide ที่จัดการได้จาก admin) */}
      {/* -mt-8 หักล้าง padding-top ของ <main> (py-8) เฉพาะหน้านี้ ให้ banner ชิดกับ header */}
      <section className="-mt-5 sm:-mt-8">
        <HeroCarousel
          slides={localizedBanners}
          locale={locale}
          fallbackSlide={{
            kicker: pickLocalized(locale, settings.home_hero_kicker, settings.home_hero_kicker_en),
            title: pickLocalized(locale, settings.home_hero_title, settings.home_hero_title_en),
            highlight: pickLocalized(locale, settings.home_hero_highlight, settings.home_hero_highlight_en),
            title_suffix: pickLocalized(locale, settings.home_hero_suffix, settings.home_hero_suffix_en),
            subtitle: pickLocalized(locale, settings.home_hero_description, settings.home_hero_description_en),
            link_url: null,
          }}
        >
          <LinkButton href="#events" variant="primary" icon="view">
            {tx(locale, "ดูงานวิ่งทั้งหมด", "View all events")}
          </LinkButton>
          <LinkButton href={getHeroSignupHref(Boolean(user))} variant="ink" icon="userPlus">
            {tx(locale, "สมัครสมาชิก", "Sign up")}
          </LinkButton>
        </HeroCarousel>
      </section>

      {/* Events */}
      <section id="events" className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="flex items-center gap-2 font-display text-2xl font-bold">
            <HeadingIcon name="calendarCheck" />
            {tx(locale, "งานที่เปิดรับสมัคร", "Open events")}
          </h2>
          <span className="font-mono text-sm text-ink/40 tnum">
            {filteredCount ?? 0} {tx(locale, "งาน", "events")}
          </span>
        </div>

        <Card>
          <form method="get" className="flex flex-col gap-4 lg:flex-row lg:items-end">
            <div className="flex-1">
              <label className="mb-1.5 block text-sm font-medium text-ink/70">{tx(locale, "ค้นหา", "Search")}</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/40">
                  <Search className="h-4 w-4" />
                </span>
                <Input name="q" defaultValue={q} placeholder={tx(locale, "ชื่องาน...", "Event name...")} className="pl-9" />
              </div>
            </div>
            <div className="w-full lg:w-48">
              <label className="mb-1.5 block text-sm font-medium text-ink/70">{tx(locale, "ประเภทค่าสมัคร", "Pricing")}</label>
              <Select name="pricing" defaultValue={pricingFilter}>
                <option value="">{tx(locale, "ทั้งหมด", "All")}</option>
                <option value="free">{tx(locale, "ฟรี", "Free")}</option>
                <option value="paid">{tx(locale, "มีค่าสมัคร", "Paid")}</option>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-ink transition hover:bg-primary-hover"
              >
                <Search className="size-4" aria-hidden="true" />
              {tx(locale, "ค้นหา", "Search")}
              </button>
              {(q || pricingFilter) && (
                <Link href="/#events" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink/50 hover:text-ink">
                  <RotateCcw className="size-4" aria-hidden="true" />
                  {tx(locale, "ล้าง", "Clear")}
                </Link>
              )}
            </div>
          </form>
        </Card>

        {list.length === 0 ? (
          <Card className="text-center text-ink/50">
            {q ? tx(locale, "ไม่พบงานที่ตรงกับเงื่อนไข", "No matching events") : tx(locale, "ยังไม่มีงานที่เปิดรับสมัคร", "No open events yet")}
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
                    <Card className="flex h-full flex-col overflow-hidden p-0 sm:p-0 hover:border-primary/40">
                      <div className="relative h-44 w-full overflow-hidden bg-lane">
                        {ev.cover_image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={ev.cover_image}
                            alt=""
                            className="h-full w-full transform-gpu object-cover transition-transform duration-700 ease-in-out group-hover:scale-110 group-focus-visible:scale-110 motion-reduce:transform-none motion-reduce:transition-none"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-ink/30">
                            <Footprints className="h-10 w-10" />
                          </div>
                        )}
                        <Badge
                          className={`absolute right-3 top-3 text-sm ${
                            ev.pricing === "free"
                              ? "bg-[rgb(10,164,57)] text-white"
                              : "bg-[rgb(255,93,0)] text-white"
                          }`}
                        >
                          {ev.pricing === "free" ? tx(locale, "ฟรี", "Free") : tx(locale, "มีค่าสมัคร", "Paid")}
                        </Badge>
                      </div>
                      <div className="flex flex-1 flex-col gap-2 p-5">
                        <h3 className="flex items-start gap-2 font-display font-bold">
                          <HeadingIcon name="calendar" className="mt-0.5 size-4" />
                          <span className="line-clamp-2">{pickLocalized(locale, ev.title, ev.title_en)}</span>
                        </h3>
                        <p className="flex flex-wrap items-center gap-1.5 font-mono text-xs text-accent tnum">
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays className="h-3.5 w-3.5" /> {formatDate(ev.start_date)} –{" "}
                            {formatDate(ev.end_date)}
                          </span>
                          {hasPackages && (
                            <span className="inline-flex items-center gap-1">
                              | <Road className="h-3.5 w-3.5" />{" "}
                              {minKm === maxKm ? `${minKm}` : `${minKm}–${maxKm}`} km |{" "}
                              {ev.packages.length} {tx(locale, "แพ็กเกจ", "packages")}
                            </span>
                          )}
                        </p>
                        {pickLocalized(locale, ev.description, ev.description_en) && (
                          <p className="line-clamp-2 text-sm text-muted">{stripHtml(pickLocalized(locale, ev.description, ev.description_en)!)}</p>
                        )}
                        <span className="mt-auto inline-flex w-fit items-center gap-1 rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-ink transition group-hover:bg-primary-hover">
                          <ChevronRight className="h-4 w-4" aria-hidden="true" /> {tx(locale, "ดูรายละเอียด", "View details")}
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
                  <ChevronLeft className="size-4" aria-hidden="true" />
                  {tx(locale, "ก่อนหน้า", "Previous")}
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
                  <ChevronRight className="size-4" aria-hidden="true" />
                  {tx(locale, "ถัดไป", "Next")}
                </Link>
              </div>
            )}
          </>
        )}
      </section>

      {pastList.length > 0 && (
        <section className="space-y-4 border-t border-lane pt-8">
          <div className="flex items-baseline justify-between gap-4">
            <div>
              <h2 className="flex items-center gap-2 font-display text-2xl font-bold">
                <HeadingIcon name="history" />
                {tx(locale, "งานที่ผ่านมา", "Past events")}
              </h2>
              <p className="mt-1 text-sm text-ink/50">{tx(locale, "งานวิ่งที่สิ้นสุดระยะเวลาดำเนินงานแล้ว", "Events whose activity period has ended")}</p>
            </div>
            <span className="shrink-0 font-mono text-sm text-ink/40 tnum">
              {pastCount ?? pastList.length} {tx(locale, "งาน", "events")}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {pastList.map((ev) => {
              const hasPackages = ev.packages.length > 0;
              const minKm = hasPackages
                ? Math.min(...ev.packages.map((p) => p.target_distance_km))
                : 0;
              const maxKm = hasPackages
                ? Math.max(...ev.packages.map((p) => p.target_distance_km))
                : 0;

              return (
                <Link key={ev.id} href={`/events/${ev.id}`} className="group">
                  <Card className="flex h-full flex-col overflow-hidden p-0 sm:p-0 hover:border-ink/25">
                    <div className="relative h-44 w-full overflow-hidden bg-lane">
                      {ev.cover_image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={ev.cover_image}
                          alt=""
                          className="h-full w-full transform-gpu object-cover grayscale transition-transform duration-700 ease-in-out group-hover:scale-110 group-focus-visible:scale-110 motion-reduce:transform-none motion-reduce:transition-none"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-ink/30 grayscale">
                          <Footprints className="h-10 w-10" />
                        </div>
                      )}
                      <Badge className="absolute right-3 top-3 bg-ink/75 text-paper">
                        {tx(locale, "งานที่ผ่านมา", "Past event")}
                      </Badge>
                    </div>
                    <div className="flex flex-1 flex-col gap-2 p-5">
                      <h3 className="flex items-start gap-2 font-display font-bold">
                        <HeadingIcon name="history" className="mt-0.5 size-4" />
                        <span className="line-clamp-2">{pickLocalized(locale, ev.title, ev.title_en)}</span>
                      </h3>
                      <p className="flex flex-wrap items-center gap-1.5 font-mono text-xs text-ink/50 tnum">
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="h-3.5 w-3.5" /> {formatDate(ev.start_date)} –{" "}
                          {formatDate(ev.end_date)}
                        </span>
                        {hasPackages && (
                          <span className="inline-flex items-center gap-1">
                            | <Road className="h-3.5 w-3.5" />{" "}
                            {minKm === maxKm ? `${minKm}` : `${minKm}–${maxKm}`} km |{" "}
                            {ev.packages.length} {tx(locale, "แพ็กเกจ", "packages")}
                          </span>
                        )}
                      </p>
                      {pickLocalized(locale, ev.description, ev.description_en) && (
                        <p className="line-clamp-2 text-sm text-muted">{stripHtml(pickLocalized(locale, ev.description, ev.description_en)!)}</p>
                      )}
                      <span className="mt-auto inline-flex w-fit items-center gap-1 rounded-full bg-lane px-4 py-1.5 text-sm font-semibold text-ink/70 transition group-hover:bg-lane/80">
                        <ChevronRight className="h-4 w-4" aria-hidden="true" /> {tx(locale, "ดูรายละเอียด", "View details")}
                      </span>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <section className="space-y-4 border-t border-lane pt-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 font-display text-2xl font-bold">
              <HeadingIcon name="article" />
              {tx(locale, "บทความและเกร็ดความรู้", "Articles and insights")}
            </h2>
            <p className="mt-1 text-sm text-ink/50">
              {tx(locale, "สาระสุขภาพ อาหาร การออกกำลังกาย และการวิ่งที่นำไปใช้ได้จริง", "Practical health, nutrition, exercise, and running insights")}
            </p>
          </div>
          <LinkButton href="/articles" variant="ghost" icon="next">
            {tx(locale, "ดูบทความทั้งหมด", "View all articles")}
          </LinkButton>
        </div>

        {latestArticles.length === 0 ? (
          <Card className="py-10 text-center text-sm text-ink/50">
            {tx(locale, "ยังไม่มีบทความที่เผยแพร่", "No published articles yet")}
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {latestArticles.map((article) => {
              const category = Array.isArray(article.category)
                ? article.category[0]
                : article.category;
              return (
                <Link key={article.id} href={`/articles/${article.slug}`} className="group">
                  <Card className="flex h-full flex-col overflow-hidden p-0 sm:p-0 hover:border-primary/40">
                    <div className="relative aspect-[16/9] w-full overflow-hidden bg-ink">
                      {article.banner_image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={article.banner_image_url}
                          alt=""
                          className="h-full w-full transform-gpu object-cover transition-transform duration-700 ease-in-out group-hover:scale-110 group-focus-visible:scale-110 motion-reduce:transform-none motion-reduce:transition-none"
                          style={{
                            objectPosition: `${article.banner_position_x}% ${article.banner_position_y}%`,
                          }}
                        />
                      ) : (
                        <div className="grid h-full place-items-center">
                          <HeadingIcon name="article" className="size-10 text-primary/50" />
                        </div>
                      )}
                      {category && (
                        <CategoryBadge
                          backgroundColor={category.badge_background_color}
                          textColor={category.badge_text_color}
                          className="absolute left-3 top-3 shadow-sm"
                        >
                          {pickLocalized(locale, category.name, category.name_en)}
                        </CategoryBadge>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col gap-2 p-5">
                      <h3 className="flex items-start gap-2 font-display font-bold">
                        <HeadingIcon name="article" className="mt-0.5 size-4" />
                        <span className="line-clamp-2">{pickLocalized(locale, article.title, article.title_en)}</span>
                      </h3>
                      <p className="inline-flex items-center gap-1.5 font-mono text-xs text-ink/45 tnum">
                        <CalendarDays className="size-3.5 shrink-0" aria-hidden="true" />
                        {formatLocalizedDate(locale, article.published_at)}
                      </p>
                      {pickLocalized(locale, article.excerpt, article.excerpt_en) && (
                        <p className="line-clamp-2 text-sm text-muted">{pickLocalized(locale, article.excerpt, article.excerpt_en)}</p>
                      )}
                      <span className="mt-auto inline-flex w-fit items-center gap-1 rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-ink transition group-hover:bg-primary-hover">
                        <ChevronRight className="size-4" aria-hidden="true" />
                        {tx(locale, "อ่านบทความ", "Read article")}
                      </span>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
