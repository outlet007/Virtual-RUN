import Link from "next/link";
import {
  Button,
  Card,
  HeadingIcon,
  ImageUploadField,
  Input,
  Label,
  Select,
  Textarea,
} from "@/components/ui";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { toDateTimeLocal } from "@/lib/content";

export type ArticleFormCategory = {
  id: string;
  name: string;
};

export type ArticleFormValue = {
  id: string;
  title: string;
  slug: string;
  category_id: string | null;
  excerpt: string | null;
  content_html: string;
  banner_image_url: string | null;
  banner_position_x: number;
  banner_position_y: number;
  cta_label: string | null;
  cta_url: string | null;
  status: string;
  is_featured: boolean;
  published_at: string | null;
  seo_title: string | null;
  seo_description: string | null;
};

export function ArticleForm({
  action,
  article,
  categories,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  article?: ArticleFormValue | null;
  categories: ArticleFormCategory[];
  submitLabel: string;
}) {
  return (
    <form action={action} className="space-y-5">
      {article && <input type="hidden" name="id" value={article.id} />}
      <input
        type="hidden"
        name="existing_banner_image_url"
        value={article?.banner_image_url ?? ""}
      />

      <Card className="space-y-4">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold">
          <HeadingIcon name="article" />
          เนื้อหาบทความ
        </h2>
        <div>
          <Label htmlFor="article-title">ชื่อบทความ</Label>
          <Input
            id="article-title"
            name="title"
            defaultValue={article?.title ?? ""}
            maxLength={240}
            required
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="article-slug">Slug</Label>
            <Input
              id="article-slug"
              name="slug"
              defaultValue={article?.slug ?? ""}
              placeholder="เว้นว่างเพื่อสร้างอัตโนมัติ"
              maxLength={180}
            />
            <p className="mt-1 text-xs text-ink/45">ใช้ใน URL เช่น news-2026</p>
          </div>
          <div>
            <Label htmlFor="article-category">หมวดหมู่</Label>
            <Select
              id="article-category"
              name="category_id"
              defaultValue={article?.category_id ?? ""}
            >
              <option value="">ไม่ระบุหมวดหมู่</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div>
          <Label htmlFor="article-excerpt">คำโปรย</Label>
          <Textarea
            id="article-excerpt"
            name="excerpt"
            defaultValue={article?.excerpt ?? ""}
            maxLength={500}
            rows={3}
            placeholder="สรุปสั้น ๆ สำหรับหน้าแสดงรายการและ SEO"
          />
        </div>
        <div>
          <Label>รายละเอียด</Label>
          <RichTextEditor
            name="content_html"
            defaultValue={article?.content_html}
            uploadTarget="content"
          />
        </div>
      </Card>

      <Card className="space-y-4">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold">
          <HeadingIcon name="banner" />
          Banner บทความ
        </h2>
        <ImageUploadField
          name="banner_image_file"
          label="รูป Banner"
          defaultImageUrl={article?.banner_image_url}
          positionXName="banner_position_x"
          positionYName="banner_position_y"
          defaultPositionX={article?.banner_position_x}
          defaultPositionY={article?.banner_position_y}
        />
        {article?.banner_image_url && (
          <label className="inline-flex items-center gap-2 text-sm font-medium text-red-700">
            <input
              type="checkbox"
              name="remove_banner"
              className="size-4 rounded border-lane accent-red-600"
            />
            นำ Banner ปัจจุบันออก
          </label>
        )}
      </Card>

      <Card className="space-y-4">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold">
          <HeadingIcon name="link" />
          ปุ่ม CTA และลิงก์
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="cta-label">ข้อความบนปุ่ม</Label>
            <Input
              id="cta-label"
              name="cta_label"
              defaultValue={article?.cta_label ?? ""}
              maxLength={80}
              placeholder="อ่านรายละเอียดเพิ่มเติม"
            />
          </div>
          <div>
            <Label htmlFor="cta-url">ลิงก์ปุ่ม</Label>
            <Input
              id="cta-url"
              name="cta_url"
              defaultValue={article?.cta_url ?? ""}
              maxLength={2048}
              placeholder="/events หรือ https://example.com"
            />
          </div>
        </div>
      </Card>

      <Card className="space-y-4">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold">
          <HeadingIcon name="settings" />
          การเผยแพร่และ SEO
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="article-status">สถานะ</Label>
            <Select
              id="article-status"
              name="status"
              defaultValue={article?.status ?? "draft"}
            >
              <option value="draft">ฉบับร่าง</option>
              <option value="published">เผยแพร่แล้ว</option>
              <option value="archived">เก็บถาวร</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="published-at">วันเวลาเผยแพร่</Label>
            <Input
              id="published-at"
              name="published_at"
              type="datetime-local"
              defaultValue={toDateTimeLocal(article?.published_at)}
            />
          </div>
        </div>
        <label className="inline-flex items-center gap-2 text-sm font-medium text-ink/70">
          <input
            type="checkbox"
            name="is_featured"
            defaultChecked={article?.is_featured}
            className="size-4 rounded border-lane accent-ink"
          />
          ปักบทความขึ้น Banner หน้าบทความ
        </label>
        <p className="-mt-3 text-xs text-ink/50">
          บทความต้องอยู่ในสถานะเผยแพร่แล้วจึงจะแสดงบน Banner
        </p>
        <div>
          <Label htmlFor="seo-title">SEO Title</Label>
          <Input
            id="seo-title"
            name="seo_title"
            defaultValue={article?.seo_title ?? ""}
            maxLength={240}
            placeholder="เว้นว่างเพื่อใช้ชื่อบทความ"
          />
        </div>
        <div>
          <Label htmlFor="seo-description">SEO Description</Label>
          <Textarea
            id="seo-description"
            name="seo_description"
            defaultValue={article?.seo_description ?? ""}
            maxLength={500}
            rows={3}
            placeholder="เว้นว่างเพื่อใช้คำโปรย"
          />
        </div>
      </Card>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link
          href="/admin/articles"
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-lane px-5 py-2 text-sm font-semibold transition hover:bg-lane/50"
        >
          ยกเลิก
        </Link>
        <Button type="submit" icon="save">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
