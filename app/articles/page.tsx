import Link from "next/link";
import { CalendarDays, ChevronRight, RotateCcw, Search } from "lucide-react";
import {
  FeaturedArticleBanner,
  type FeaturedArticleSlide,
} from "@/components/articles/featured-article-banner";
import {
  Badge,
  Button,
  Card,
  HeadingIcon,
  Input,
  Label,
  Select,
} from "@/components/ui";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 12;
type Relation<T> = T | T[] | null;
type PublicArticleRow = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  banner_image_url: string | null;
  banner_position_x: number;
  banner_position_y: number;
  published_at: string;
  category: Relation<{ id: string; name: string; slug: string }>;
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
  const supabase = await createClient();
  const [{ data: categories, error: categoryError }, { data: featuredRaw, error: featuredError }] =
    await Promise.all([
      supabase
        .from("content_categories")
        .select("id, name, slug, description")
        .eq("is_active", true)
        .order("sort_order")
        .order("name"),
      supabase
        .from("content_articles")
        .select(
          "id, title, slug, excerpt, banner_image_url, banner_position_x, banner_position_y, category:content_categories(name)",
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
      title: article.title,
      slug: article.slug,
      excerpt: article.excerpt,
      bannerImageUrl: article.banner_image_url,
      bannerPositionX: article.banner_position_x,
      bannerPositionY: article.banner_position_y,
      categoryName: category?.name ?? null,
    };
  });

  const selectedCategory = (categories ?? []).find((category) => category.slug === categorySlug);
  let query = supabase
    .from("content_articles")
    .select(
      "id, title, slug, excerpt, banner_image_url, banner_position_x, banner_position_y, published_at, category:content_categories(id, name, slug)",
      { count: "exact" },
    )
    .eq("status", "published")
    .lte("published_at", new Date().toISOString())
    .order("is_featured", { ascending: false })
    .order("published_at", { ascending: false });
  if (selectedCategory) query = query.eq("category_id", selectedCategory.id);
  const safeSearch = q.replace(/[,%()]/g, " ").trim();
  if (safeSearch) {
    query = query.or(`title.ilike.%${safeSearch}%,excerpt.ilike.%${safeSearch}%`);
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
          บทความและเกร็ดความรู้
        </h1>
        <p className="mt-1 text-sm text-muted">
          ข่าวประชาสัมพันธ์ เกร็ดความรู้ และข้อมูลที่น่าสนใจจาก Virtual RUN
        </p>
      </div>

      <Card>
        <form method="get" className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_260px_auto] lg:items-end">
            <div>
              <Label htmlFor="public-article-search">ค้นหาบทความ</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink/40" />
                <Input
                  id="public-article-search"
                  name="q"
                  defaultValue={q}
                  className="pl-9"
                  placeholder="ชื่อหรือเนื้อหาที่สนใจ"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="public-article-category">หมวดหมู่</Label>
              <Select
                id="public-article-category"
                name="category"
                defaultValue={categorySlug}
              >
                <option value="">ทุกหมวดหมู่</option>
                {(categories ?? []).map((category) => (
                  <option key={category.id} value={category.slug}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </div>
            <Button type="submit" icon="search">ค้นหา</Button>
          </div>
          {(q || categorySlug) && (
            <Link
              href="/articles"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-lane px-4 text-sm font-semibold hover:bg-lane/50"
            >
              <RotateCcw className="size-4" /> ล้างการค้นหา
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
          ยังไม่มีบทความที่ตรงกับเงื่อนไข
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
                      <Badge className="absolute left-3 top-3 bg-primary text-ink shadow-sm">
                        {category.name}
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-5">
                    <h2 className="flex items-start gap-2 font-display font-bold">
                      <HeadingIcon name="article" className="mt-0.5 size-4" />
                      <span className="line-clamp-2">{article.title}</span>
                    </h2>
                    <p className="inline-flex items-center gap-1.5 font-mono text-xs text-ink/45 tnum">
                      <CalendarDays className="size-3.5 shrink-0" aria-hidden="true" />
                      {new Date(article.published_at).toLocaleDateString("th-TH", {
                        dateStyle: "medium",
                        timeZone: "Asia/Bangkok",
                      })}
                    </p>
                    {article.excerpt && (
                      <p className="line-clamp-2 text-sm text-muted">{article.excerpt}</p>
                    )}
                    <span className="mt-auto inline-flex w-fit items-center gap-1 rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-ink transition group-hover:bg-primary-hover">
                      <ChevronRight className="size-4" aria-hidden="true" />
                      อ่านบทความ
                    </span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {pageCount > 1 && (
        <nav className="flex items-center justify-center gap-3" aria-label="หน้าบทความ">
          {page > 1 && (
            <Link
              href={buildPageHref(page - 1)}
              className="rounded-xl border border-lane px-4 py-2 text-sm font-semibold hover:bg-lane/50"
            >
              ← ก่อนหน้า
            </Link>
          )}
          <span className="font-mono text-sm text-ink/50 tnum">หน้า {page} / {pageCount}</span>
          {page < pageCount && (
            <Link
              href={buildPageHref(page + 1)}
              className="rounded-xl border border-lane px-4 py-2 text-sm font-semibold hover:bg-lane/50"
            >
              ถัดไป →
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
