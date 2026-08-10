import Link from "next/link";
import { RotateCcw, Search } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  HeadingIcon,
  Input,
  Label,
  LinkButton,
  Select,
  Textarea,
} from "@/components/ui";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import {
  ContentViewsChart,
  type ContentDailyAnalyticsPoint,
} from "@/components/admin/content-views-chart";
import {
  createContentCategory,
  deleteContentArticle,
  deleteContentCategory,
  updateContentCategory,
} from "@/lib/actions/content";
import { requireManager } from "@/lib/auth/admin";
import {
  CONTENT_STATUS_LABELS,
  normalizeContentStatus,
  type ContentStatus,
} from "@/lib/content";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type Relation<T> = T | T[] | null;
type ArticleRow = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  status: ContentStatus;
  is_featured: boolean;
  published_at: string | null;
  updated_at: string;
  category: Relation<{ id: string; name: string }>;
};
type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
};
type OverviewRow = {
  total_views: number | string;
  unique_visitors: number | string;
  views_30d: number | string;
  unique_visitors_30d: number | string;
};
type DailyRow = {
  view_date: string;
  views: number | string;
  unique_visitors: number | string;
};
type TopArticleRow = {
  article_id: string;
  title: string;
  slug: string;
  status: string;
  views: number | string;
  unique_visitors: number | string;
};
type DimensionRow = { device_type?: string; referrer_host?: string; views: number | string };

const statusClass: Record<ContentStatus, string> = {
  draft: "bg-lane text-muted",
  published: "bg-primary-soft text-primary-dark",
  archived: "bg-medal-soft text-medal",
};

function firstRelation<T>(value: Relation<T>) {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function normalizeSearch(value: unknown) {
  return String(value ?? "").normalize("NFKC").toLocaleLowerCase("th-TH").trim();
}

function bangkokDateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

const deviceLabels: Record<string, string> = {
  desktop: "เดสก์ท็อป",
  mobile: "มือถือ",
  tablet: "แท็บเล็ต",
  bot: "Bot / Crawler",
  unknown: "ไม่ทราบ",
};

export default async function AdminArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    categoryId?: string;
    error?: string;
    category_saved?: string;
    category_deleted?: string;
    article_deleted?: string;
  }>;
}) {
  await requireManager();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const status = sp.status && sp.status !== "all"
    ? normalizeContentStatus(sp.status)
    : "all";
  const categoryId = (sp.categoryId ?? "").trim();
  const db = createAdminClient();
  const today = bangkokDateKey(new Date());
  const startDate = new Date(today + "T00:00:00.000Z");
  startDate.setUTCDate(startDate.getUTCDate() - 29);
  const startDateKey = startDate.toISOString().slice(0, 10);

  const [
    articlesResult,
    categoriesResult,
    overviewResult,
    dailyResult,
    topResult,
    deviceResult,
    referrerResult,
  ] = await Promise.all([
    db
      .from("content_articles")
      .select(
        "id, title, slug, excerpt, status, is_featured, published_at, updated_at, category:content_categories(id, name)",
      )
      .order("updated_at", { ascending: false }),
    db.from("content_categories").select("*").order("sort_order").order("name"),
    db.rpc("get_content_analytics_overview"),
    db.rpc("get_content_daily_analytics", {
      p_start_date: startDateKey,
      p_end_date: today,
    }),
    db.rpc("get_content_top_articles", { p_start_date: startDateKey, p_limit: 10 }),
    db.rpc("get_content_device_analytics", { p_start_date: startDateKey }),
    db.rpc("get_content_referrer_analytics", { p_start_date: startDateKey, p_limit: 8 }),
  ]);

  const firstError = [
    articlesResult.error,
    categoriesResult.error,
    overviewResult.error,
    dailyResult.error,
    topResult.error,
    deviceResult.error,
    referrerResult.error,
  ].find(Boolean);
  if (firstError) throw new Error(firstError.message);

  const articles = (articlesResult.data ?? []) as unknown as ArticleRow[];
  const categories = (categoriesResult.data ?? []) as CategoryRow[];
  const searchNeedle = normalizeSearch(q);
  const filteredArticles = articles.filter((article) => {
    const category = firstRelation(article.category);
    if (status !== "all" && article.status !== status) return false;
    if (categoryId && category?.id !== categoryId) return false;
    if (!searchNeedle) return true;
    return [article.title, article.slug, article.excerpt, category?.name].some((value) =>
      normalizeSearch(value).includes(searchNeedle),
    );
  });

  const overview = ((overviewResult.data ?? [])[0] ?? {}) as OverviewRow;
  const dailyData: ContentDailyAnalyticsPoint[] = (
    (dailyResult.data ?? []) as DailyRow[]
  ).map((row) => ({
    date: new Date(row.view_date + "T00:00:00.000Z").toLocaleDateString("th-TH", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }),
    label: new Date(row.view_date + "T00:00:00.000Z").toLocaleDateString("th-TH", {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    }),
    views: Number(row.views),
    uniqueVisitors: Number(row.unique_visitors),
  }));
  const topArticles = (topResult.data ?? []) as TopArticleRow[];
  const deviceRows = (deviceResult.data ?? []) as DimensionRow[];
  const referrerRows = (referrerResult.data ?? []) as DimensionRow[];
  const publishedCount = articles.filter((article) => article.status === "published").length;
  const draftCount = articles.filter((article) => article.status === "draft").length;
  const summary = [
    { label: "บทความทั้งหมด", value: articles.length },
    { label: "เผยแพร่แล้ว", value: publishedCount },
    { label: "ฉบับร่าง", value: draftCount },
    { label: "เข้าชม 30 วัน", value: Number(overview.views_30d ?? 0) },
    { label: "ผู้เยี่ยมชม 30 วัน", value: Number(overview.unique_visitors_30d ?? 0) },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-xl font-bold">
            <HeadingIcon name="article" />
            จัดการบทความ
          </h2>
          <p className="mt-1 text-sm text-muted">
            ข่าวประชาสัมพันธ์ เกร็ดความรู้ เนื้อหา Banner, CTA, SEO และสถิติการเข้าชม
          </p>
        </div>
        <LinkButton href="/admin/articles/new" icon="add">
          สร้างบทความใหม่
        </LinkButton>
      </div>

      {sp.error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{sp.error}</div>
      )}
      {(sp.category_saved || sp.category_deleted || sp.article_deleted) && (
        <div className="rounded-xl bg-primary-soft px-4 py-3 text-sm text-primary-dark">
          บันทึกการเปลี่ยนแปลงแล้ว
        </div>
      )}

      <section aria-labelledby="content-overview-heading">
        <h3
          id="content-overview-heading"
          className="mb-3 flex items-center gap-2 font-display text-lg font-bold"
        >
          <HeadingIcon name="overview" />
          ภาพรวมเนื้อหา
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {summary.map((item) => (
            <Card key={item.label}>
              <p className="text-xs uppercase tracking-wider text-ink/45">{item.label}</p>
              <p className="mt-1 font-mono text-3xl font-bold tnum">
                {item.value.toLocaleString("th-TH")}
              </p>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="content-views-heading">
        <div className="mb-3">
          <h3
            id="content-views-heading"
            className="flex items-center gap-2 font-display text-lg font-bold"
          >
            <HeadingIcon name="chart" />
            แนวโน้มการเข้าชม 30 วัน
          </h3>
          <p className="mt-1 text-sm text-ink/50">
            แท่งแสดง page views และเส้นแสดงผู้เยี่ยมชมไม่ซ้ำ
          </p>
        </div>
        <Card>
          <ContentViewsChart data={dailyData} />
        </Card>
      </section>

      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <section aria-labelledby="top-content-heading">
          <h3
            id="top-content-heading"
            className="mb-3 flex items-center gap-2 font-display text-lg font-bold"
          >
            <HeadingIcon name="trophy" className="text-medal" />
            บทความยอดนิยม 30 วัน
          </h3>
          <Card className="overflow-hidden p-0 sm:p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead className="bg-lane/35 text-xs text-ink/55">
                  <tr>
                    <th className="px-4 py-3">บทความ</th>
                    <th className="px-4 py-3 text-right">เข้าชม</th>
                    <th className="px-4 py-3 text-right">ผู้เยี่ยมชม</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-lane">
                  {topArticles.map((article) => (
                    <tr key={article.article_id}>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/articles/${article.article_id}`}
                          className="font-semibold hover:text-primary-dark"
                        >
                          {article.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right font-mono tnum">
                        {Number(article.views).toLocaleString("th-TH")}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tnum">
                        {Number(article.unique_visitors).toLocaleString("th-TH")}
                      </td>
                    </tr>
                  ))}
                  {topArticles.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-ink/45">
                        ยังไม่มีข้อมูลการเข้าชม
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </section>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <Card>
            <h3 className="flex items-center gap-2 font-display font-bold">
              <HeadingIcon name="activity" className="size-4" />
              อุปกรณ์ที่ใช้
            </h3>
            <ul className="mt-3 space-y-2 text-sm">
              {deviceRows.map((row) => (
                <li key={row.device_type} className="flex justify-between gap-3">
                  <span className="text-ink/60">{deviceLabels[row.device_type ?? "unknown"]}</span>
                  <strong className="font-mono tnum">{Number(row.views).toLocaleString("th-TH")}</strong>
                </li>
              ))}
              {deviceRows.length === 0 && <li className="text-ink/45">ยังไม่มีข้อมูล</li>}
            </ul>
          </Card>
          <Card>
            <h3 className="flex items-center gap-2 font-display font-bold">
              <HeadingIcon name="link" className="size-4" />
              แหล่งที่มา
            </h3>
            <ul className="mt-3 space-y-2 text-sm">
              {referrerRows.map((row) => (
                <li key={row.referrer_host} className="flex justify-between gap-3">
                  <span className="min-w-0 truncate text-ink/60">{row.referrer_host}</span>
                  <strong className="font-mono tnum">{Number(row.views).toLocaleString("th-TH")}</strong>
                </li>
              ))}
              {referrerRows.length === 0 && <li className="text-ink/45">Direct / ยังไม่มีข้อมูล</li>}
            </ul>
          </Card>
        </div>
      </div>

      <section aria-labelledby="article-list-heading" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 id="article-list-heading" className="flex items-center gap-2 font-display text-lg font-bold">
            <HeadingIcon name="clipboard" />
            รายการบทความ
          </h3>
          <span className="font-mono text-sm text-ink/45 tnum">
            {filteredArticles.length} รายการ
          </span>
        </div>
        <Card>
          <form method="get" className="space-y-4">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_220px_auto] lg:items-end">
              <div>
                <Label htmlFor="article-search">ค้นหา</Label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink/40" />
                  <Input
                    id="article-search"
                    name="q"
                    defaultValue={q}
                    className="pl-9"
                    placeholder="ชื่อ Slug คำโปรย หรือหมวดหมู่"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="article-filter-status">สถานะ</Label>
                <Select id="article-filter-status" name="status" defaultValue={status}>
                  <option value="all">ทุกสถานะ</option>
                  <option value="published">เผยแพร่แล้ว</option>
                  <option value="draft">ฉบับร่าง</option>
                  <option value="archived">เก็บถาวร</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="article-filter-category">หมวดหมู่</Label>
                <Select id="article-filter-category" name="categoryId" defaultValue={categoryId}>
                  <option value="">ทุกหมวดหมู่</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </Select>
              </div>
              <Button type="submit" icon="search">ค้นหา</Button>
            </div>
            {(q || status !== "all" || categoryId) && (
              <Link
                href="/admin/articles"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-lane px-4 text-sm font-semibold hover:bg-lane/50"
              >
                <RotateCcw className="size-4" /> ล้างการค้นหา
              </Link>
            )}
          </form>
        </Card>

        <Card className="overflow-hidden p-0 sm:p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-lane/35 text-xs text-ink/55">
                <tr>
                  <th className="px-4 py-3">บทความ</th>
                  <th className="px-4 py-3">หมวดหมู่</th>
                  <th className="px-4 py-3">สถานะ</th>
                  <th className="px-4 py-3">อัปเดตล่าสุด</th>
                  <th className="px-4 py-3 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-lane">
                {filteredArticles.map((article) => {
                  const category = firstRelation(article.category);
                  return (
                    <tr key={article.id} className="hover:bg-lane/20">
                      <td className="max-w-[360px] px-4 py-4">
                        <p className="font-semibold">{article.title}</p>
                        <p className="mt-1 truncate font-mono text-xs text-ink/45">/{article.slug}</p>
                      </td>
                      <td className="px-4 py-4 text-ink/60">{category?.name ?? "—"}</td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className={statusClass[article.status]}>
                            {CONTENT_STATUS_LABELS[article.status]}
                          </Badge>
                          {article.is_featured && (
                            <Badge className="bg-medal-soft text-medal">ปักบน Banner</Badge>
                          )}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 font-mono text-xs text-ink/55 tnum">
                        {new Date(article.updated_at).toLocaleString("th-TH", {
                          dateStyle: "medium",
                          timeStyle: "short",
                          timeZone: "Asia/Bangkok",
                        })}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <LinkButton
                            href={`/admin/articles/${article.id}`}
                            variant="ghost"
                            icon="edit"
                            className="min-h-9 px-3 py-1"
                          >
                            แก้ไข
                          </LinkButton>
                          <form action={deleteContentArticle}>
                            <input type="hidden" name="id" value={article.id} />
                            <ConfirmDeleteButton
                              formAction={deleteContentArticle}
                              triggerLabel="ลบ"
                              title="ยืนยันการลบบทความ"
                              description={`ต้องการลบ “${article.title}” และข้อมูลสถิติทั้งหมดใช่หรือไม่?`}
                            />
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredArticles.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-ink/45">
                      ไม่พบบทความที่ตรงกับเงื่อนไข
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      <section aria-labelledby="category-management-heading" className="space-y-4">
        <div>
          <h3 id="category-management-heading" className="flex items-center gap-2 font-display text-lg font-bold">
            <HeadingIcon name="package" />
            จัดการหมวดหมู่
          </h3>
          <p className="mt-1 text-sm text-ink/50">
            ใช้แบ่งข่าวประชาสัมพันธ์ เกร็ดความรู้ และเนื้อหาประเภทอื่น
          </p>
        </div>
        <Card>
          <form action={createContentCategory} className="grid gap-3 lg:grid-cols-[1fr_1fr_100px_auto] lg:items-end">
            <div>
              <Label>ชื่อหมวดหมู่</Label>
              <Input name="name" required />
            </div>
            <div>
              <Label>Slug</Label>
              <Input name="slug" placeholder="เว้นว่างเพื่อสร้างอัตโนมัติ" />
            </div>
            <div>
              <Label>ลำดับ</Label>
              <Input name="sort_order" type="number" min={0} defaultValue={0} />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" name="is_active" defaultChecked /> เปิดใช้
              </label>
              <Button type="submit" icon="add">เพิ่มหมวดหมู่</Button>
            </div>
          </form>
        </Card>
        <div className="space-y-3">
          {categories.map((category) => (
            <Card key={category.id}>
              <form action={updateContentCategory} className="space-y-3">
                <input type="hidden" name="id" value={category.id} />
                <div className="grid gap-3 lg:grid-cols-[1fr_1fr_100px_auto] lg:items-end">
                  <div>
                    <Label>ชื่อหมวดหมู่</Label>
                    <Input name="name" defaultValue={category.name} required />
                  </div>
                  <div>
                    <Label>Slug</Label>
                    <Input name="slug" defaultValue={category.slug} required />
                  </div>
                  <div>
                    <Label>ลำดับ</Label>
                    <Input name="sort_order" type="number" min={0} defaultValue={category.sort_order} />
                  </div>
                  <label className="inline-flex min-h-11 items-center gap-2 text-sm">
                    <input type="checkbox" name="is_active" defaultChecked={category.is_active} />
                    เปิดใช้งาน
                  </label>
                </div>
                <div>
                  <Label>คำอธิบาย</Label>
                  <Textarea name="description" rows={2} maxLength={500} defaultValue={category.description ?? ""} />
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <Button type="submit" variant="ghost" icon="save">บันทึกหมวดหมู่</Button>
                  <ConfirmDeleteButton
                    formAction={deleteContentCategory}
                    triggerLabel="ลบหมวดหมู่"
                    title="ยืนยันการลบหมวดหมู่"
                    description={`บทความในหมวด “${category.name}” จะถูกเปลี่ยนเป็นไม่ระบุหมวดหมู่`}
                  />
                </div>
              </form>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
