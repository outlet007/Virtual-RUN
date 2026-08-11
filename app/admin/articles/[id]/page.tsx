import { notFound } from "next/navigation";
import { ArticleForm, type ArticleFormValue } from "@/components/admin/article-form";
import { HeadingIcon, LinkButton } from "@/components/ui";
import { updateContentArticle } from "@/lib/actions/content";
import { requireManager } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function EditArticlePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; created?: string; saved?: string }>;
}) {
  await requireManager();
  const { id } = await params;
  const sp = await searchParams;
  const db = createAdminClient();
  const [{ data: article, error }, { data: categories, error: categoriesError }] =
    await Promise.all([
      db.from("content_articles").select("*").eq("id", id).single(),
      db.from("content_categories").select("id, name, name_en").order("sort_order").order("name"),
    ]);
  if (error || !article) notFound();
  if (categoriesError) throw new Error(categoriesError.message);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-xl font-bold">
            <HeadingIcon name="edit" />
            แก้ไขบทความ
          </h2>
          <p className="mt-1 text-sm text-muted">{article.title}</p>
        </div>
        {article.status === "published" && (
          <LinkButton href={`/articles/${article.slug}`} variant="ghost" icon="view">
            ดูหน้าบทความ
          </LinkButton>
        )}
      </div>
      {sp.error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{sp.error}</div>
      )}
      {(sp.created || sp.saved) && (
        <div className="rounded-xl bg-primary-soft px-4 py-3 text-sm text-primary-dark">
          บันทึกบทความแล้ว
        </div>
      )}
      <ArticleForm
        action={updateContentArticle}
        article={article as ArticleFormValue}
        categories={categories ?? []}
        submitLabel="บันทึกบทความ"
      />
    </div>
  );
}
