import Link from "next/link";
import { notFound } from "next/navigation";
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
import { CategoryBadge } from "@/components/articles/category-badge";
import { ColorField } from "@/components/admin/color-field";
import { CreateArticleModal } from "@/components/admin/create-article-modal";
import { CreateCategoryModal } from "@/components/admin/create-category-modal";
import { EditArticleModal } from "@/components/admin/edit-article-modal";
import { ArticleForm, type ArticleFormValue } from "@/components/admin/article-form";
import {
  ContentViewsChart,
  type ContentDailyAnalyticsPoint,
} from "@/components/admin/content-views-chart";
import {
  deleteContentArticle,
  deleteContentCategory,
  createContentArticle,
  updateContentArticle,
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
  category: Relation<{
    id: string;
    name: string;
    badge_background_color: string;
    badge_text_color: string;
  }>;
};
type CategoryRow = {
  id: string;
  name: string;
  name_en: string | null;
  slug: string;
  description: string | null;
  description_en: string | null;
  sort_order: number;
  is_active: boolean;
  badge_background_color: string;
  badge_text_color: string;
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


export default async function AdminArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    view?: string;
    create?: string;
    create_category?: string;
    edit?: string;
    status?: string;
    categoryId?: string;
    error?: string;
    category_saved?: string;
    category_deleted?: string;
    article_deleted?: string;
    article_saved?: string;
  }>;
}) {
  await requireManager();
  const sp = await searchParams;
  const view = ["overview", "articles", "categories"].includes(sp.view ?? "")
    ? (sp.view as "overview" | "articles" | "categories")
    : "overview";
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
    dailyResult,
    topResult,
  ] = await Promise.all([
    db
      .from("content_articles")
      .select(
        "id, title, slug, excerpt, status, is_featured, published_at, updated_at, category:content_categories(id, name, badge_background_color, badge_text_color)",
      )
      .order("updated_at", { ascending: false }),
    db.from("content_categories").select("*").order("sort_order").order("name"),
    db.rpc("get_content_daily_analytics", {
      p_start_date: startDateKey,
      p_end_date: today,
    }),
        db.rpc("get_content_top_articles", { p_start_date: startDateKey, p_limit: 10 }),
  ]);

  const firstError = [
    articlesResult.error,
    categoriesResult.error,
    dailyResult.error,
    topResult.error,
  ].find(Boolean);
  if (firstError) throw new Error(firstError.message);

  const articles = (articlesResult.data ?? []) as unknown as ArticleRow[];
  const categories = (categoriesResult.data ?? []) as CategoryRow[];

  const editArticleId = view === "articles" ? (sp.edit ?? "").trim() : "";
  let editArticle: ArticleFormValue | null = null;
  if (editArticleId) {
    const { data, error } = await db
      .from("content_articles")
      .select("*")
      .eq("id", editArticleId)
      .maybeSingle();
    if (error || !data) notFound();
    editArticle = data as ArticleFormValue;
  }

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

  return (
    <div className="space-y-8">
      <div>
        <h2 className="flex items-center gap-2 font-display text-xl font-bold">
          <HeadingIcon name="article" />
          จัดการบทความ
        </h2>
        <p className="mt-1 text-sm text-muted">
          ข่าวประชาสัมพันธ์ เกร็ดความรู้ เนื้อหา Banner, CTA, SEO และสถิติการเข้าชม
        </p>
      </div>

      {sp.error && sp.create !== "1" && sp.create_category !== "1" && !sp.edit && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{sp.error}</div>
      )}
      {(sp.category_saved || sp.category_deleted || sp.article_deleted || sp.article_saved) && (
        <div className="rounded-xl bg-primary-soft px-4 py-3 text-sm text-primary-dark">
          บันทึกการเปลี่ยนแปลงแล้ว
        </div>
      )}

<nav
        aria-label="เมนูย่อยการจัดการบทความ"
        className="flex max-w-full gap-1 overflow-x-auto border-b border-lane pb-2 text-sm"
      >
        {[
          { id: "overview", label: "ภาพรวม" },
          { id: "articles", label: "บทความ" },
          { id: "categories", label: "หมวดหมู่" },
        ].map((item) => (
          <Link
            key={item.id}
            href={"/admin/articles?view=" + item.id}
            aria-current={view === item.id ? "page" : undefined}
            className={
              "shrink-0 whitespace-nowrap rounded-lg px-4 py-2 font-semibold transition " +
              (view === item.id
                ? "bg-ink text-paper"
                : "text-ink/60 hover:bg-lane/60 hover:text-ink")
            }
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {view === "overview" && (
        <>
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

      <div>
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

      </div>

        </>
      )}

      {view === "articles" && (
      <section aria-labelledby="article-list-heading" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 id="article-list-heading" className="flex items-center gap-2 font-display text-lg font-bold">
            <HeadingIcon name="clipboard" />
            รายการบทความ
          </h3>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <span className="font-mono text-sm text-ink/45 tnum">
              {filteredArticles.length} รายการ
            </span>
            <CreateArticleModal
              initialOpen={sp.create === "1"}
              error={view === "articles" ? sp.error : undefined}
            >
              <ArticleForm
                action={createContentArticle}
                categories={categories}
                submitLabel="สร้างบทความ"
              />
            </CreateArticleModal>
          </div>
        </div>
        <Card>
          <form method="get" className="space-y-4">
            <input type="hidden" name="view" value="articles" />
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
                href="/admin/articles?view=articles"
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
                      <td className="px-4 py-4 text-ink/60">
                        {category ? (
                          <CategoryBadge
                            backgroundColor={category.badge_background_color}
                            textColor={category.badge_text_color}
                          >
                            {category.name}
                          </CategoryBadge>
                        ) : "—"}
                      </td>
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
                            href={"/admin/articles?view=articles&edit=" + article.id}
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
      )}

      {editArticle && (
        <EditArticleModal
          articleTitle={editArticle.title}
          publishedHref={editArticle.status === "published" ? "/articles/" + editArticle.slug : undefined}
          error={sp.error}
        >
          <ArticleForm
            action={updateContentArticle}
            article={editArticle}
            categories={categories}
            submitLabel="บันทึกบทความ"
          />
        </EditArticleModal>
      )}

      {view === "categories" && (
      <section aria-labelledby="category-management-heading" className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 id="category-management-heading" className="flex items-center gap-2 font-display text-lg font-bold">
              <HeadingIcon name="package" />
              จัดการหมวดหมู่
            </h3>
            <p className="mt-1 text-sm text-ink/50">
              ใช้แบ่งข่าวประชาสัมพันธ์ เกร็ดความรู้ และเนื้อหาประเภทอื่น
            </p>
          </div>
          <CreateCategoryModal
            initialOpen={sp.create_category === "1"}
            error={view === "categories" && sp.create_category === "1" ? sp.error : undefined}
          />
        </div>
        <div className="space-y-3">
          {categories.map((category) => (
            <Card key={category.id}>
              <form action={updateContentCategory} className="space-y-3">
                <input type="hidden" name="id" value={category.id} />
                <div className="grid gap-3 lg:grid-cols-[1fr_1fr_100px_auto] lg:items-end">
                  <div>
                    <Label>ชื่อหมวดหมู่ (ไทย)</Label>
                    <Input name="name" defaultValue={category.name} required />
                  </div>
                  <div><Label>Category Name (English)</Label><Input name="name_en" defaultValue={category.name_en ?? ""} /></div>
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
                <div><Label>Description (English)</Label><Textarea name="description_en" rows={2} maxLength={500} defaultValue={category.description_en ?? ""} /></div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
                  <ColorField
                    name="badge_background_color"
                    label="สีพื้น Badge"
                    defaultValue={category.badge_background_color}
                  />
                  <ColorField
                    name="badge_text_color"
                    label="สีตัวอักษร Badge"
                    defaultValue={category.badge_text_color}
                  />
                  <div>
                    <Label>ตัวอย่าง</Label>
                    <div className="flex min-h-11 items-center">
                      <CategoryBadge
                        backgroundColor={category.badge_background_color}
                        textColor={category.badge_text_color}
                      >
                        {category.name}
                      </CategoryBadge>
                    </div>
                  </div>
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
      )}
    </div>
  );
}
