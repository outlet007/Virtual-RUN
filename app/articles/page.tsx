import Link from "next/link";
import { CalendarDays, ChevronRight, RotateCcw, Search } from "lucide-react";
import {
  FeaturedArticleBanner,
  type FeaturedArticleSlide,
} from "@/components/articles/featured-article-banner";
import { CategoryBadge } from "@/components/articles/category-badge";
import {
  Button,
  Card,
  HeadingIcon,
  Input,
  Label,
  Select,
} from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n/server";
import { formatLocalizedDate, pickLocalized, tx } from "@/lib/i18n/shared";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 12;
type Relation<T> = T | T[] | null;
type PublicArticleRow = {
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
  category: Relation<{
    id: string;
    name: string;
    name_en: string | null;
    slug: string;
    badge_background_color: string;
    badge_text_color: string;
  }>;
};

function firstRelation<T>(value: Relation<T>) {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default async function ArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const categorySlug = (sp.category ?? "").trim();
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const [supabase, locale] = await Promise.all([createClient(), getLocale()]);
  const [{ data: categories, error: categoryError }, { data: featuredRaw, error: featuredError }] =
    await Promise.all([
      supabase
        .from("content_categories")
        .select("id, name, name_en, slug, description, description_en")
        .eq("is_active", true)
        .order("sort_order")
        .order("name"),
      supabase
        .from("content_articles")
        .select(
          "id, title, title_en, slug, excerpt, excerpt_en, banner_image_url, banner_position_x, banner_position_y, category:content_categories(name, name_en, badge_background_color, badge_text_color)",
        )
        .eq("status", "published")
        .eq("is_featured", true)
        .lte("published_at", new Date().toISOString())
        .order("published_at", { ascending: false })
        .limit(5),
    ]);
  if (categoryError) throw new Error(categoryError.message);
  if (featuredError) throw new Error(featuredError.message);

  const featuredSlides: FeaturedArticleSlide[] = (featuredRaw ?? []).map((article) => {
    const category = firstRelation(article.category);
    return {
      id: article.id,
      title: pickLocalized(locale, article.title, article.title_en),
      slug: article.slug,
      excerpt: pickLocalized(locale, article.excerpt, article.excerpt_en),
      bannerImageUrl: article.banner_image_url,
      bannerPositionX: article.banner_position_x,
      bannerPositionY: article.banner_position_y,
      categoryName: category ? pickLocalized(locale, category.name, category.name_en) : null,
      categoryBackgroundColor: category?.badge_background_color ?? null,
      categoryTextColor: category?.badge_text_color ?? null,
    };
  });

  const selectedCategory = (categories ?? []).find((category) => category.slug === categorySlug);
  let query = supabase
    .from("content_articles")
    .select(
      "id, title, title_en, slug, excerpt, excerpt_en, banner_image_url, banner_position_x, banner_position_y, published_at, category:content_categories(id, name, name_en, slug, badge_background_color, badge_text_color)",
      { count: "exact" },
    )
    .eq("status", "published")
    .lte("published_at", new Date().toISOString())
    .order("is_featured", { ascending: false })
    .order("published_at", { ascending: false });
  if (selectedCategory) query = query.eq("category_id", selectedCategory.id);
  const safeSearch = q.replace(/[,%()]/g, " ").trim();
  if (safeSearch) {
    query = query.or(
      "title.ilike.%" + safeSearch +
        "%,title_en.ilike.%" + safeSearch +
        "%,excerpt.ilike.%" + safeSearch +
        "%,excerpt_en.ilike.%" + safeSearch + "%",
    );
  }
  const from = (page - 1) * PAGE_SIZE;
  const { data, count, error } = await query.range(from, from + PAGE_SIZE - 1);
  if (error) throw new Error(error.message);
  const articles = (data ?? []) as unknown as PublicArticleRow[];
  const pageCount = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  const buildPageHref = (nextPage: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (categorySlug) params.set("category", categorySlug);
    params.set("page", String(nextPage));
    return `/articles?${params.toString()}`;
  };

  return (
    <div className="space-y-6">
      <FeaturedArticleBanner slides={featuredSlides} />

      <div>
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold">
          <HeadingIcon name="article" />
          {tx(locale, "บทความและเกร็ดความรู้", "Articles and insights")}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {tx(locale, "ข่าวประชาสัมพันธ์ เกร็ดความรู้ และข้อมูลที่น่าสนใจจาก Virtual RUN", "News, practical insights, and stories from Virtual RUN")}
        </p>
      </div>

      <Card>
        <form method="get" className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_260px_auto] lg:items-end">
            <div>
              <Label htmlFor="public-article-search">{tx(locale, "ค้นหาบทความ", "Search articles")}</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink/40" />
                <Input
                  id="public-article-search"
                  name="q"
                  defaultValue={q}
                  className="pl-9"
                  placeholder={tx(locale, "ชื่อหรือเนื้อหาที่สนใจ", "Title or topic")}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="public-article-category">{tx(locale, "หมวดหมู่", "Category")}</Label>
              <Select
                id="public-article-category"
                name="category"
                defaultValue={categorySlug}
              >
                <option value="">{tx(locale, "ทุกหมวดหมู่", "All categories")}</option>
                {(categories ?? []).map((category) => (
                  <option key={category.id} value={category.slug}>
                    {pickLocalized(locale, category.name, category.name_en)}
                  </option>
                ))}
              </Select>
            </div>
            <Button type="submit" icon="search">{tx(locale, "ค้นหา", "Search")}</Button>
          </div>
          {(q || categorySlug) && (
            <Link
              href="/articles"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-lane px-4 text-sm font-semibold hover:bg-lane/50"
            >
              <RotateCcw className="size-4" /> {tx(locale, "ล้างการค้นหา", "Clear search")}
            </Link>
          )}
        </form>
      </Card>

      {selectedCategory?.description && (
        <Card className="bg-primary-soft text-primary-dark">
          <strong>{selectedCategory.name}</strong>
          <p className="mt-1 text-sm">{selectedCategory.description}</p>
        </Card>
      )}

      {articles.length === 0 ? (
        <Card className="py-12 text-center text-ink/50">
          {tx(locale, "ยังไม่มีบทความที่ตรงกับเงื่อนไข", "No matching articles")}
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => {
            const category = firstRelation(article.category);
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
                    <h2 className="flex items-start gap-2 font-display font-bold">
                      <HeadingIcon name="article" className="mt-0.5 size-4" />
                      <span className="line-clamp-2">{pickLocalized(locale, article.title, article.title_en)}</span>
                    </h2>
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

      {pageCount > 1 && (
        <nav className="flex items-center justify-center gap-3" aria-label={tx(locale, "หน้าบทความ", "Article pages")}>
          {page > 1 && (
            <Link
              href={buildPageHref(page - 1)}
              className="rounded-xl border border-lane px-4 py-2 text-sm font-semibold hover:bg-lane/50"
            >
              ← {tx(locale, "ก่อนหน้า", "Previous")}
            </Link>
          )}
          <span className="font-mono text-sm text-ink/50 tnum">{tx(locale, "หน้า", "Page")} {page} / {pageCount}</span>
          {page < pageCount && (
            <Link
              href={buildPageHref(page + 1)}
              className="rounded-xl border border-lane px-4 py-2 text-sm font-semibold hover:bg-lane/50"
            >
              {tx(locale, "ถัดไป", "Next")} →
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
