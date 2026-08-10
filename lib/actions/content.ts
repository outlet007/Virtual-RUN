"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireManager } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createContentSlug,
  normalizeContentLink,
  normalizeContentStatus,
  sanitizeContentHtml,
} from "@/lib/content";

function contentError(path: string, message: string): never {
  const separator = path.includes("?") ? "&" : "?";
  redirect(`${path}${separator}error=${encodeURIComponent(message)}`);
}

function parsePosition(value: FormDataEntryValue | null) {
  const position = Number(value ?? 50);
  return Number.isFinite(position) ? Math.min(100, Math.max(0, Math.round(position))) : 50;
}

function parseSortOrder(value: FormDataEntryValue | null) {
  const sortOrder = Number(value ?? 0);
  return Number.isFinite(sortOrder) ? Math.max(0, Math.round(sortOrder)) : 0;
}

const contentMimeExtensions: Record<string, string> = {
  "image/gif": "gif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/webm": "webm",
};

async function uploadContentAsset(
  file: FormDataEntryValue | null,
  folder: string,
  kind: "image" | "video",
) {
  if (!(file instanceof File) || file.size === 0) return null;
  const extension = contentMimeExtensions[file.type];
  const validType = kind === "image"
    ? file.type.startsWith("image/")
    : file.type === "video/mp4" || file.type === "video/webm";
  if (!extension || !validType) throw new Error("ชนิดไฟล์ไม่รองรับ");
  const maxSize = kind === "image" ? 5 * 1024 * 1024 : 50 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error(kind === "image" ? "รูปต้องมีขนาดไม่เกิน 5 MB" : "วิดีโอต้องมีขนาดไม่เกิน 50 MB");
  }

  const db = createAdminClient();
  const path = `${folder}/${crypto.randomUUID()}.${extension}`;
  const { error } = await db.storage
    .from("content-assets")
    .upload(path, file, { contentType: file.type });
  if (error) throw new Error(error.message);
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/content-assets/${path}`;
}

export async function uploadContentDescriptionImage(formData: FormData) {
  await requireManager();
  return uploadContentAsset(formData.get("image_file"), "editor/images", "image");
}

export async function uploadContentDescriptionVideo(formData: FormData) {
  await requireManager();
  return uploadContentAsset(formData.get("video_file"), "editor/videos", "video");
}

export async function createContentCategory(formData: FormData) {
  await requireManager();
  const db = createAdminClient();
  const name = String(formData.get("name") ?? "").trim();
  const slug = createContentSlug(formData.get("slug"), name);
  const description = String(formData.get("description") ?? "").trim() || null;
  if (!name) contentError("/admin/articles", "กรอกชื่อหมวดหมู่");

  const { error } = await db.from("content_categories").insert({
    name,
    slug,
    description,
    sort_order: parseSortOrder(formData.get("sort_order")),
    is_active: formData.get("is_active") === "on",
  });
  if (error) contentError("/admin/articles", error.code === "23505" ? "Slug หมวดหมู่นี้ถูกใช้แล้ว" : error.message);

  revalidatePath("/admin/articles");
  revalidatePath("/articles");
  redirect("/admin/articles?category_saved=1");
}

export async function updateContentCategory(formData: FormData) {
  await requireManager();
  const db = createAdminClient();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const slug = createContentSlug(formData.get("slug"), name);
  if (!id || !name) contentError("/admin/articles", "ข้อมูลหมวดหมู่ไม่ครบ");

  const { error } = await db
    .from("content_categories")
    .update({
      name,
      slug,
      description: String(formData.get("description") ?? "").trim() || null,
      sort_order: parseSortOrder(formData.get("sort_order")),
      is_active: formData.get("is_active") === "on",
    })
    .eq("id", id);
  if (error) contentError("/admin/articles", error.code === "23505" ? "Slug หมวดหมู่นี้ถูกใช้แล้ว" : error.message);

  revalidatePath("/admin/articles");
  revalidatePath("/articles");
  redirect("/admin/articles?category_saved=1");
}

export async function deleteContentCategory(formData: FormData) {
  await requireManager();
  const db = createAdminClient();
  const id = String(formData.get("id") ?? "");
  if (!id) contentError("/admin/articles", "ไม่พบหมวดหมู่");
  const { error } = await db.from("content_categories").delete().eq("id", id);
  if (error) contentError("/admin/articles", error.message);
  revalidatePath("/admin/articles");
  revalidatePath("/articles");
  redirect("/admin/articles?category_deleted=1");
}

function parsePublishedAt(value: FormDataEntryValue | null, status: string) {
  const input = String(value ?? "").trim();
  if (input) {
    const date = new Date(input + (input.endsWith("Z") ? "" : ":00+07:00"));
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }
  return status === "published" ? new Date().toISOString() : null;
}

function readArticleFields(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const slug = createContentSlug(formData.get("slug"), title);
  const status = normalizeContentStatus(formData.get("status"));
  const ctaLabel = String(formData.get("cta_label") ?? "").trim() || null;
  const ctaUrlInput = String(formData.get("cta_url") ?? "").trim();
  const ctaUrl = normalizeContentLink(ctaUrlInput);
  if (!title) throw new Error("กรอกชื่อบทความ");
  if ((ctaLabel && !ctaUrl) || (!ctaLabel && ctaUrlInput)) {
    throw new Error("ปุ่ม CTA ต้องมีทั้งข้อความและลิงก์ที่เป็น http(s) หรือ path ภายในเว็บ");
  }
  return {
    title,
    slug,
    category_id: String(formData.get("category_id") ?? "").trim() || null,
    excerpt: String(formData.get("excerpt") ?? "").trim() || null,
    content_html: sanitizeContentHtml(String(formData.get("content_html") ?? "").trim()),
    banner_position_x: parsePosition(formData.get("banner_position_x")),
    banner_position_y: parsePosition(formData.get("banner_position_y")),
    cta_label: ctaLabel,
    cta_url: ctaUrl,
    status,
    is_featured: formData.get("is_featured") === "on",
    published_at: parsePublishedAt(formData.get("published_at"), status),
    seo_title: String(formData.get("seo_title") ?? "").trim() || null,
    seo_description: String(formData.get("seo_description") ?? "").trim() || null,
  };
}

export async function createContentArticle(formData: FormData) {
  await requireManager();
  const db = createAdminClient();
  let fields: ReturnType<typeof readArticleFields>;
  try {
    fields = readArticleFields(formData);
  } catch (error) {
    contentError("/admin/articles/new", (error as Error).message);
  }

  let bannerImageUrl: string | null = null;
  try {
    bannerImageUrl = await uploadContentAsset(formData.get("banner_image_file"), "banners", "image");
  } catch (error) {
    contentError("/admin/articles/new", (error as Error).message);
  }

  const { data, error } = await db
    .from("content_articles")
    .insert({ ...fields!, banner_image_url: bannerImageUrl })
    .select("id")
    .single();
  if (error) {
    contentError("/admin/articles/new", error.code === "23505" ? "Slug บทความนี้ถูกใช้แล้ว" : error.message);
  }

  revalidatePath("/admin/articles");
  revalidatePath("/articles");
  redirect(`/admin/articles/${data!.id}?created=1`);
}

export async function updateContentArticle(formData: FormData) {
  await requireManager();
  const db = createAdminClient();
  const id = String(formData.get("id") ?? "");
  if (!id) contentError("/admin/articles", "ไม่พบบทความ");

  let fields: ReturnType<typeof readArticleFields>;
  try {
    fields = readArticleFields(formData);
  } catch (error) {
    contentError(`/admin/articles/${id}`, (error as Error).message);
  }

  let bannerImageUrl = String(formData.get("existing_banner_image_url") ?? "").trim() || null;
  if (formData.get("remove_banner") === "on") bannerImageUrl = null;
  try {
    const uploaded = await uploadContentAsset(formData.get("banner_image_file"), "banners", "image");
    if (uploaded) bannerImageUrl = uploaded;
  } catch (error) {
    contentError(`/admin/articles/${id}`, (error as Error).message);
  }

  const { error } = await db
    .from("content_articles")
    .update({ ...fields!, banner_image_url: bannerImageUrl })
    .eq("id", id);
  if (error) {
    contentError(`/admin/articles/${id}`, error.code === "23505" ? "Slug บทความนี้ถูกใช้แล้ว" : error.message);
  }

  revalidatePath("/admin/articles");
  revalidatePath(`/admin/articles/${id}`);
  revalidatePath("/articles");
  revalidatePath(`/articles/${fields!.slug}`);
  redirect(`/admin/articles/${id}?saved=1`);
}

export async function deleteContentArticle(formData: FormData) {
  await requireManager();
  const db = createAdminClient();
  const id = String(formData.get("id") ?? "");
  if (!id) contentError("/admin/articles", "ไม่พบบทความ");
  const { error } = await db.from("content_articles").delete().eq("id", id);
  if (error) contentError("/admin/articles", error.message);
  revalidatePath("/admin/articles");
  revalidatePath("/articles");
  redirect("/admin/articles?article_deleted=1");
}
