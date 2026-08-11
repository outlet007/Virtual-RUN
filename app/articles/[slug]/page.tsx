import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, ChevronLeft, Clock3 } from "lucide-react";
import { ArticleViewTracker } from "@/components/article-view-tracker";
import { CategoryBadge } from "@/components/articles/category-badge";
import { Card, HeadingIcon, LinkButton } from "@/components/ui";
import { estimateReadingMinutes } from "@/lib/content";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n/server";
import { formatLocalizedDate, pickLocalized, tx } from "@/lib/i18n/shared";

export const dynamic = "force-dynamic";

type Relation<T> = T | T[] | null;
type ArticleDetail = {
  id: string;
  title: string;
  title_en: string | null;
  slug: string;
  excerpt: string | null;
  excerpt_en: string | null;
  content_html: string;
  content_html_en: string | null;
  banner_image_url: string | null;
  banner_position_x: number;
  banner_position_y: number;
  cta_label: string | null;
  cta_label_en: string | null;
  cta_url: string | null;
  published_at: string;
  seo_title: string | null;
  seo_title_en: string | null;
  seo_description: string | null;
  seo_description_en: string | null;
  category_id: string | null;
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

async function getArticle(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("content_articles")
    .select(
      "id, title, title_en, slug, excerpt, excerpt_en, content_html, content_html_en, banner_image_url, banner_position_x, banner_position_y, cta_label, cta_label_en, cta_url, published_at, seo_title, seo_title_en, seo_description, seo_description_en, category_id, category:content_categories(id, name, name_en, slug, badge_background_color, badge_text_color)",
    )
    .eq("slug", slug)
    .eq("status", "published")
    .lte("published_at", new Date().toISOString())
    .single();
  return data as unknown as ArticleDetail | null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) return {};
  const locale = await getLocale();
  const title = pickLocalized(locale, article.seo_title || article.title, article.seo_title_en || article.title_en);
  const description = pickLocalized(locale, article.seo_description || article.excerpt, article.seo_description_en || article.excerpt_en);
  return {
    title,
    description: description || undefined,
    openGraph: {
      title,
      description: description || undefined,
      images: article.banner_image_url ? [article.banner_image_url] : undefined,
      type: "article",
      publishedTime: article.published_at,
    },
  };
}

export default async function ArticleDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) notFound();
  const locale = await getLocale();
  const category = firstRelation(article.category);
  const title = pickLocalized(locale, article.title, article.title_en);
  const excerpt = pickLocalized(locale, article.excerpt, article.excerpt_en);
  const contentHtml = pickLocalized(locale, article.content_html, article.content_html_en);
  const ctaLabel = pickLocalized(locale, article.cta_label, article.cta_label_en);
  const supabase = await createClient();
  const { data: relatedRaw } = article.category_id
    ? await supabase
        .from("content_articles")
        .select("id, title, title_en, slug, excerpt, excerpt_en, banner_image_url, published_at")
        .eq("category_id", article.category_id)
        .eq("status", "published")
        .lte("published_at", new Date().toISOString())
        .neq("id", article.id)
        .order("published_at", { ascending: false })
        .limit(3)
    : { data: [] };

  const ctaExternal = article.cta_url?.startsWith("http");

  return (
    <article className="space-y-6">
      <ArticleViewTracker articleId={article.id} />
      <header className="relative left-1/2 right-1/2 -mx-[50vw] -mt-5 min-h-[420px] w-screen overflow-hidden bg-ink sm:-mt-8 sm:min-h-[480px]">
        {article.banner_image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={article.banner_image_url}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            style={{
              objectPosition: `${article.banner_position_x}% ${article.banner_position_y}%`,
            }}
          />
        )}
        <div className="absolute inset-0 bg-black/25" aria-hidden="true" />
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-black/15"
          aria-hidden="true"
        />
        <div className="relative mx-auto flex min-h-[420px] max-w-[1500px] flex-col justify-end px-3 py-6 sm:min-h-[480px] sm:px-4 sm:py-8">
          <div className="max-w-4xl">
            {category && (
              <Link href={`/articles?category=${category.slug}`}>
                <CategoryBadge
                  backgroundColor={category.badge_background_color}
                  textColor={category.badge_text_color}
                  className="w-fit text-sm shadow-sm"
                >
                  {pickLocalized(locale, category.name, category.name_en)}
                </CategoryBadge>
              </Link>
            )}
            <h1 className="mt-3 flex items-start gap-3 font-display text-3xl font-bold leading-tight text-white drop-shadow-md sm:text-4xl">
              <HeadingIcon name="article" className="mt-1 size-7 text-primary sm:size-8" />
              {title}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-4 font-mono text-sm font-medium text-white/90 drop-shadow-sm tnum">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-4" />
                {formatLocalizedDate(locale, article.published_at, "long")}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock3 className="size-4" />
                {tx(locale, "อ่านประมาณ", "About")} {estimateReadingMinutes(contentHtml)} {tx(locale, "นาที", "min read")}
              </span>
            </div>
            {excerpt && (
              <p className="mt-2 line-clamp-2 max-w-3xl text-sm leading-relaxed text-white/85 drop-shadow-sm sm:text-base">
                {excerpt}
              </p>
            )}
          </div>
        </div>
      </header>

      <Link
        href="/articles"
        className="inline-flex w-fit items-center gap-1 rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-ink transition hover:bg-primary-hover"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        {tx(locale, "บทความทั้งหมด", "All articles")}
      </Link>

      <Card className="w-full">
        <div
          className="prose prose-sm max-w-none prose-headings:font-display prose-headings:text-ink prose-a:text-primary-dark prose-img:rounded-xl"
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />
        {ctaLabel && article.cta_url && (
          <div className="mt-8 border-t border-lane pt-6">
            <LinkButton
              href={article.cta_url}
              icon={ctaExternal ? "external" : "next"}
              target={ctaExternal ? "_blank" : undefined}
              rel={ctaExternal ? "noopener noreferrer" : undefined}
            >
              {ctaLabel}
            </LinkButton>
          </div>
        )}
      </Card>

      {(relatedRaw ?? []).length > 0 && (
        <section aria-labelledby="related-articles-heading" className="border-t border-lane pt-6">
          <h2
            id="related-articles-heading"
            className="mb-4 flex items-center gap-2 font-display text-xl font-bold"
          >
            <HeadingIcon name="article" />
            {tx(locale, "บทความที่เกี่ยวข้อง", "Related articles")}
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {(relatedRaw ?? []).map((related) => (
              <Card key={related.id} className="p-0 sm:p-0">
                <Link href={`/articles/${related.slug}`} className="block h-full">
                  {related.banner_image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={related.banner_image_url}
                      alt=""
                      className="aspect-[16/9] w-full rounded-t-2xl object-cover"
                    />
                  )}
                  <div className="p-4">
                    <h3 className="flex items-start gap-2 font-display font-bold">
                      <HeadingIcon name="article" className="mt-0.5 size-4" />
                      <span className="line-clamp-2">{pickLocalized(locale, related.title, related.title_en)}</span>
                    </h3>
                    {pickLocalized(locale, related.excerpt, related.excerpt_en) && (
                      <p className="mt-2 line-clamp-2 text-sm text-muted">{pickLocalized(locale, related.excerpt, related.excerpt_en)}</p>
                    )}
                  </div>
                </Link>
              </Card>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
