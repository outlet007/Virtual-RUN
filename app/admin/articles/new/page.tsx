import { ArticleForm } from "@/components/admin/article-form";
import { HeadingIcon } from "@/components/ui";
import { createContentArticle } from "@/lib/actions/content";
import { requireManager } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function NewArticlePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireManager();
  const sp = await searchParams;
  const db = createAdminClient();
  const { data: categories, error } = await db
    .from("content_categories")
    .select("id, name, name_en")
    .order("sort_order")
    .order("name");
  if (error) throw new Error(error.message);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <h2 className="flex items-center gap-2 font-display text-xl font-bold">
          <HeadingIcon name="article" />
          สร้างบทความใหม่
        </h2>
        <p className="mt-1 text-sm text-muted">
          สร้างข่าวประชาสัมพันธ์ เกร็ดความรู้ หรือเนื้อหาอื่นสำหรับหน้าเว็บไซต์
        </p>
      </div>
      {sp.error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{sp.error}</div>
      )}
      <ArticleForm
        action={createContentArticle}
        categories={categories ?? []}
        submitLabel="สร้างบทความ"
      />
    </div>
  );
}
