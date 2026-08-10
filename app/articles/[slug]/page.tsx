import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, ChevronLeft, Clock3 } from "lucide-react";
import { ArticleViewTracker } from "@/components/article-view-tracker";
import { Badge, Card, HeadingIcon, LinkButton } from "@/components/ui";
import { estimateReadingMinutes } from "@/lib/content";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Relation<T> = T | T[] | null;
type ArticleDetail = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content_html: string;
  banner_image_url: string | null;
  banner_position_x: number;
  banner_position_y: number;
  cta_label: string | null;
  cta_url: string | null;
  published_at: string;
  seo_title: string | null;
  seo_description: string | null;
  category_id: string | null;
  category: Relation<{ id: string; name: string; slug: string }>;
};

function firstRelation<T>(value: Relation<T>) {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

async function getArticle(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("content_articles")
    .select(
      "id, title, slug, excerpt, content_html, banner_image_url, banner_position_x, banner_position_y, cta_label, cta_url, published_at, seo_title, seo_description, category_id, category:content_categories(id, name, slug)",
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
  return {
    title: article.seo_title || article.title,
    description: article.seo_description || article.excerpt || undefined,
    openGraph: {
      title: article.seo_title || article.title,
      description: article.seo_description || article.excerpt || undefined,
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
  const category = firstRelation(article.category);
  const supabase = await createClient();
  const { data: relatedRaw } = article.category_id
    ? await supabase
        .from("content_articles")
        .select("id, title, slug, excerpt, banner_image_url, published_at")
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
                <Badge className="w-fit bg-primary text-sm text-ink shadow-sm">
                  {category.name}
                </Badge>
              </Link>
            )}
            <h1 className="mt-3 flex items-start gap-3 font-display text-3xl font-bold leading-tight text-white drop-shadow-md sm:text-4xl">
              <HeadingIcon name="article" className="mt-1 size-7 text-primary sm:size-8" />
              {article.title}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-4 font-mono text-sm font-medium text-white/90 drop-shadow-sm tnum">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-4" />
                {new Date(article.published_at).toLocaleDateString("th-TH", {
                  dateStyle: "long",
                  timeZone: "Asia/Bangkok",
                })}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock3 className="size-4" />
                อ่านประมาณ {estimateReadingMinutes(article.content_html)} นาที
              </span>
            </div>
            {article.excerpt && (
              <p className="mt-2 line-clamp-2 max-w-3xl text-sm leading-relaxed text-white/85 drop-shadow-sm sm:text-base">
                {article.excerpt}
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
        บทความทั้งหมด
      </Link>

      <Card className="w-full">
        <div
          className="prose prose-sm max-w-none prose-headings:font-display prose-headings:text-ink prose-a:text-primary-dark prose-img:rounded-xl"
          dangerouslySetInnerHTML={{ __html: article.content_html }}
        />
        {article.cta_label && article.cta_url && (
          <div className="mt-8 border-t border-lane pt-6">
            <LinkButton
              href={article.cta_url}
              icon={ctaExternal ? "external" : "next"}
              target={ctaExternal ? "_blank" : undefined}
              rel={ctaExternal ? "noopener noreferrer" : undefined}
            >
              {article.cta_label}
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
            บทความที่เกี่ยวข้อง
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
                      <span className="line-clamp-2">{related.title}</span>
                    </h3>
                    {related.excerpt && (
                      <p className="mt-2 line-clamp-2 text-sm text-muted">{related.excerpt}</p>
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
