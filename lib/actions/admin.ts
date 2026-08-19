"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import sanitizeHtml from "sanitize-html";
import {
  ADMIN_ROLES,
  type AdminRole,
  requireAdmin,
  requireManager,
  requireSuperAdmin,
} from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidBibPrefix, normalizeBibPrefix } from "@/lib/bib";
import {
  awardForApprovedSubmission,
} from "@/lib/gamification";
import { notifyUser } from "@/lib/notifications";
import { readRunEvidence } from "@/lib/ocr/run-evidence";
import {
  hasCookieConsentText,
  sanitizeCookieConsentHtml,
} from "@/lib/cookie-consent-html";
import { CONTENT_BACKGROUND_DISPLAYS } from "@/lib/system-settings";

type GuardedReviewResult = {
  submission_id: string;
  previous_status: string;
  submission_status: string;
  registration_id: string;
  user_id: string;
  distance_km: number;
};

function err(path: string, message: string): never {
  const separator = path.includes("?") ? "&" : "?";
  redirect(`${path}${separator}error=${encodeURIComponent(message)}`);
}

// รายละเอียดงานเป็น rich text (HTML) จาก RichTextEditor — admin เขียนได้เอง แต่ต้องแสดง
// ให้ผู้ใช้ทุกคนดู จึง sanitize ก่อนเก็บเสมอ กัน stored XSS หาก session admin โดนขโมย
function sanitizeDescription(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      "p", "br", "strong", "em", "b", "i", "u", "s",
      "h1", "h2", "h3", "ul", "ol", "li", "img", "blockquote", "code", "pre",
      "video", "source", "iframe",
    ],
    allowedAttributes: {
      img: ["src", "alt"],
      video: ["src", "controls", "class"],
      source: ["src", "type"],
      iframe: ["src", "width", "height", "allow", "allowfullscreen", "frameborder"],
    },
    allowedSchemes: ["http", "https"],
    // จำกัด iframe ให้ฝังได้แค่โดเมนวิดีโอที่เชื่อถือได้ — กัน admin (หรือ session admin ที่โดนขโมย)
    // ฝัง iframe ชี้ไปเว็บ phishing/clickjacking อื่นผ่านช่องทางเดียวกันนี้
    allowedIframeHostnames: [
      "www.youtube.com", "youtube.com",
      "www.youtube-nocookie.com", "youtube-nocookie.com",
      "player.vimeo.com",
    ],
  });
}

function parseImagePosition(value: FormDataEntryValue | null): number {
  const position = Number(value ?? 50);
  if (!Number.isFinite(position)) return 50;
  return Math.min(100, Math.max(0, Math.round(position)));
}

// อัปโหลดรูปปกงาน/รูปเหรียญเข้า bucket สาธารณะ "event-images" แล้วคืน public URL
// (ต่างจาก run-evidence ที่ private — รูปพวกนี้ต้องโชว์ในหน้าเว็บสาธารณะได้)
async function uploadEventFile(
  db: ReturnType<typeof createAdminClient>,
  file: FormDataEntryValue | null,
  bucket: string,
  folder: string,
): Promise<string | null> {
  if (!(file instanceof File) || file.size === 0) return null;
  const ext = file.type.split("/")[1] ?? "jpg";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await db.storage
    .from(bucket)
    .upload(path, file, { contentType: file.type });
  if (error) throw new Error(error.message);
  // สร้าง public URL เองจาก NEXT_PUBLIC_SUPABASE_URL เสมอ (ไม่ใช้ getPublicUrl() ของ admin client)
  // เพราะ admin client อาจตั้ง SUPABASE_URL แยกไว้ใช้ host.docker.internal ตอนรันใน Docker —
  // ค่านั้นใช้ได้แค่จากใน container เท่านั้น แต่ URL นี้ browser จริงต้องเปิดได้ด้วย
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}

function uploadEventImage(
  db: ReturnType<typeof createAdminClient>,
  file: FormDataEntryValue | null,
  folder: string,
): Promise<string | null> {
  return uploadEventFile(db, file, "event-images", folder);
}

// เรียกตรงจาก RichTextEditor (client component) ไม่ใช่ผ่าน <form> — คืนค่า URL ตรงๆ
// ไม่ redirect เหมือน action อื่นในไฟล์นี้ เพราะ editor ต้องได้ URL กลับไปแทรกรูปทันที
export async function uploadDescriptionImage(formData: FormData): Promise<string | null> {
  await requireManager();
  const db = createAdminClient();
  return uploadEventImage(db, formData.get("image_file"), "description");
}

export async function uploadDescriptionVideo(formData: FormData): Promise<string | null> {
  await requireManager();
  const db = createAdminClient();
  return uploadEventFile(db, formData.get("video_file"), "event-videos", "description");
}

// ---------- Events ----------

export async function createEvent(formData: FormData) {
  await requireManager();
  const db = createAdminClient();

  const title = String(formData.get("title") ?? "").trim();
  const title_en = String(formData.get("title_en") ?? "").trim() || null;
  const bib_prefix = normalizeBibPrefix(formData.get("bib_prefix"));
  const description = sanitizeDescription(String(formData.get("description") ?? "").trim());
  const description_en = sanitizeDescription(String(formData.get("description_en") ?? "").trim());
  const pricing = String(formData.get("pricing") ?? "free");
  const start_date = String(formData.get("start_date") ?? "");
  const end_date = String(formData.get("end_date") ?? "");
  const status = String(formData.get("status") ?? "draft");
  const cover_position_x = parseImagePosition(formData.get("cover_position_x"));
  const cover_position_y = parseImagePosition(formData.get("cover_position_y"));

  if (!title || !start_date || !end_date) {
    err("/admin/events?create=1", "กรอกชื่องานและวันที่ให้ครบ");
  }
  if (!isValidBibPrefix(bib_prefix)) {
    err("/admin/events?create=1", "คำนำหน้า BIB ต้องเป็นตัวอักษรอังกฤษหรือตัวเลข 2–8 ตัว");
  }

  let cover_image: string | null = null;
  let poster_image: string | null = null;
  try {
    cover_image = await uploadEventImage(db, formData.get("cover_image_file"), "covers");
    poster_image = await uploadEventImage(db, formData.get("poster_image_file"), "posters");
  } catch (e) {
    err("/admin/events?create=1", (e as Error).message);
  }

  const { data, error } = await db
    .from("events")
    .insert({
      title,
      title_en,
      bib_prefix,
      description: description || null,
      description_en: description_en || null,
      cover_image,
      cover_position_x,
      cover_position_y,
      poster_image,
      pricing,
      start_date,
      end_date,
      status,
    })
    .select("id")
    .single();

  if (error) err("/admin/events?create=1", error.message);

  revalidatePath("/admin/events");
  revalidatePath("/");
  redirect(`/admin/events/${data!.id}?created=1`);
}

export async function updateEvent(formData: FormData) {
  await requireManager();
  const db = createAdminClient();

  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const title_en = String(formData.get("title_en") ?? "").trim() || null;
  const bib_prefix = normalizeBibPrefix(formData.get("bib_prefix"));
  const description = sanitizeDescription(String(formData.get("description") ?? "").trim());
  const description_en = sanitizeDescription(String(formData.get("description_en") ?? "").trim());
  const pricing = String(formData.get("pricing") ?? "free");
  const start_date = String(formData.get("start_date") ?? "");
  const end_date = String(formData.get("end_date") ?? "");
  const status = String(formData.get("status") ?? "draft");
  const cover_position_x = parseImagePosition(formData.get("cover_position_x"));
  const cover_position_y = parseImagePosition(formData.get("cover_position_y"));

  if (!id || !title || !start_date || !end_date) {
    err(`/admin/events/${id}`, "กรอกชื่องานและวันที่ให้ครบ");
  }
  if (!isValidBibPrefix(bib_prefix)) {
    err(`/admin/events/${id}`, "คำนำหน้า BIB ต้องเป็นตัวอักษรอังกฤษหรือตัวเลข 2–8 ตัว");
  }

  // ถ้าไม่ได้เลือกไฟล์ใหม่ ใช้รูปเดิมต่อ (ส่งมาจาก hidden field ในฟอร์ม)
  let cover_image = String(formData.get("existing_cover_image") ?? "").trim() || null;
  let poster_image = String(formData.get("existing_poster_image") ?? "").trim() || null;
  try {
    const uploadedCover = await uploadEventImage(db, formData.get("cover_image_file"), "covers");
    if (uploadedCover) cover_image = uploadedCover;
    const uploadedPoster = await uploadEventImage(db, formData.get("poster_image_file"), "posters");
    if (uploadedPoster) poster_image = uploadedPoster;
  } catch (e) {
    err(`/admin/events/${id}`, (e as Error).message);
  }

  const { error } = await db
    .from("events")
    .update({
      title,
      title_en,
      bib_prefix,
      description: description || null,
      description_en: description_en || null,
      cover_image,
      cover_position_x,
      cover_position_y,
      poster_image,
      pricing,
      start_date,
      end_date,
      status,
    })
    .eq("id", id);

  if (error) err(`/admin/events/${id}`, error.message);

  revalidatePath("/admin/events");
  revalidatePath(`/admin/events/${id}`);
  revalidatePath("/events/" + id);
  revalidatePath("/");
  redirect(`/admin/events/${id}?saved=1`);
}

export async function deleteEvent(formData: FormData) {
  await requireManager();
  const db = createAdminClient();
  const id = String(formData.get("id") ?? "");

  if (!id) err("/admin/events", "ไม่พบงานที่ต้องการลบ");

  const { count: registrationCount, error: countError } = await db
    .from("registrations")
    .select("id", { count: "exact", head: true })
    .eq("event_id", id);
  if (countError) err(`/admin/events/${id}`, countError.message);
  if ((registrationCount ?? 0) > 0) {
    err(
      `/admin/events/${id}`,
      "ไม่สามารถลบงานที่มีผู้สมัครแล้วได้ เพื่อรักษาประวัติการสมัครและผลวิ่ง",
    );
  }

  const { error } = await db.from("events").delete().eq("id", id);
  if (error) err(`/admin/events/${id}`, error.message);

  revalidatePath("/admin/events");
  revalidatePath("/");
  redirect("/admin/events?event_deleted=1");
}

// ---------- Packages ----------

async function getPackagePrice(
  db: ReturnType<typeof createAdminClient>,
  eventId: string,
  formData: FormData,
) {
  const { data: event, error } = await db
    .from("events")
    .select("pricing")
    .eq("id", eventId)
    .maybeSingle();
  if (error) err(`/admin/events/${eventId}?tab=packages`, error.message);
  if (!event) err(`/admin/events/${eventId}?tab=packages`, "ไม่พบงาน");
  if (event.pricing === "free") return 0;

  const price = Number(formData.get("price") ?? 0);
  if (!Number.isFinite(price) || price < 0) {
    err(`/admin/events/${eventId}?tab=packages`, "กรอกราคาแพ็กเกจให้ถูกต้อง");
  }
  return price;
}

async function getPackageDigitalMedalId(
  db: ReturnType<typeof createAdminClient>,
  eventId: string,
  formData: FormData,
) {
  if (formData.get("has_digital_medal") !== "on") return null;

  const medalId = String(formData.get("digital_medal_id") ?? "");
  if (!medalId) {
    err(`/admin/events/${eventId}?tab=packages`, "กรุณาเลือกเหรียญดิจิทัล");
  }

  const { data: medal, error } = await db
    .from("medals")
    .select("id")
    .eq("id", medalId)
    .eq("event_id", eventId)
    .maybeSingle();
  if (error) err(`/admin/events/${eventId}?tab=packages`, error.message);
  if (!medal) {
    err(`/admin/events/${eventId}?tab=packages`, "เหรียญดิจิทัลที่เลือกไม่ใช่ของงานนี้");
  }

  return medal.id;
}

async function getPackagePhysicalMedalId(
  db: ReturnType<typeof createAdminClient>,
  eventId: string,
  formData: FormData,
) {
  if (formData.get("has_physical_medal") !== "on") return null;

  const medalId = String(formData.get("physical_medal_id") ?? "");
  if (!medalId) {
    err(`/admin/events/${eventId}?tab=packages`, "กรุณาเลือกเหรียญจริง");
  }

  const { data: medal, error } = await db
    .from("physical_medals")
    .select("id")
    .eq("id", medalId)
    .eq("event_id", eventId)
    .maybeSingle();
  if (error) err(`/admin/events/${eventId}?tab=packages`, error.message);
  if (!medal) {
    err(`/admin/events/${eventId}?tab=packages`, "เหรียญจริงที่เลือกไม่ใช่ของงานนี้");
  }

  return medal.id;
}

export async function createPackage(formData: FormData) {
  await requireManager();
  const db = createAdminClient();

  const event_id = String(formData.get("event_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const name_en = String(formData.get("name_en") ?? "").trim() || null;
  const target_distance_km = Number(formData.get("target_distance_km") ?? 0);
  const activity_types = formData.getAll("activity_types").map(String);

  if (!event_id || !name || target_distance_km <= 0) {
    err(`/admin/events/${event_id}?tab=packages`, "กรอกชื่อแพ็กเกจและระยะเป้าหมายให้ถูกต้อง");
  }
  const digital_medal_id = await getPackageDigitalMedalId(db, event_id, formData);
  const physical_medal_id = await getPackagePhysicalMedalId(db, event_id, formData);
  const has_physical_medal = Boolean(physical_medal_id);
  const price = await getPackagePrice(db, event_id, formData);

  const { data: lastPackage } = await db
    .from("packages")
    .select("sort_order")
    .eq("event_id", event_id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const sort_order = (lastPackage?.sort_order ?? -1) + 1;

  const { error } = await db.from("packages").insert({
    event_id,
    name,
    name_en,
    target_distance_km,
    price,
    activity_types: activity_types.length > 0 ? activity_types : ["run", "walk"],
    has_physical_medal,
    digital_medal_id,
    physical_medal_id,
    sort_order,
  });

  if (error) err(`/admin/events/${event_id}?tab=packages`, error.message);

  revalidatePath(`/admin/events/${event_id}`);
  revalidatePath("/");
  redirect(`/admin/events/${event_id}?tab=packages&package_added=1`);
}

export async function updatePackage(formData: FormData) {
  await requireManager();
  const db = createAdminClient();

  const id = String(formData.get("id") ?? "");
  const event_id = String(formData.get("event_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const name_en = String(formData.get("name_en") ?? "").trim() || null;
  const target_distance_km = Number(formData.get("target_distance_km") ?? 0);
  const activity_types = formData.getAll("activity_types").map(String);

  if (!id || !event_id || !name || target_distance_km <= 0) {
    err(`/admin/events/${event_id}?tab=packages`, "กรอกชื่อแพ็กเกจและระยะเป้าหมายให้ถูกต้อง");
  }
  const digital_medal_id = await getPackageDigitalMedalId(db, event_id, formData);
  const physical_medal_id = await getPackagePhysicalMedalId(db, event_id, formData);
  const has_physical_medal = Boolean(physical_medal_id);
  const price = await getPackagePrice(db, event_id, formData);

  const { error } = await db
    .from("packages")
    .update({
      name,
      name_en,
      target_distance_km,
      price,
      activity_types: activity_types.length > 0 ? activity_types : ["run", "walk"],
      has_physical_medal,
      digital_medal_id,
      physical_medal_id,
    })
    .eq("id", id);

  if (error) err(`/admin/events/${event_id}?tab=packages`, error.message);

  revalidatePath(`/admin/events/${event_id}`);
  revalidatePath("/");
  redirect(`/admin/events/${event_id}?tab=packages&package_saved=1`);
}

export async function deletePackage(formData: FormData) {
  await requireManager();
  const db = createAdminClient();
  const id = String(formData.get("id") ?? "");
  const eventId = String(formData.get("event_id") ?? "");

  if (!id || !eventId) {
    err(`/admin/events/${eventId}?tab=packages`, "ไม่พบแพ็กเกจที่ต้องการลบ");
  }

  const { count: registrationCount, error: countError } = await db
    .from("registrations")
    .select("id", { count: "exact", head: true })
    .eq("package_id", id);
  if (countError) err(`/admin/events/${eventId}?tab=packages`, countError.message);
  if ((registrationCount ?? 0) > 0) {
    err(
      `/admin/events/${eventId}?tab=packages`,
      "ไม่สามารถลบแพ็กเกจที่มีผู้สมัครแล้วได้ เพื่อรักษาประวัติการสมัคร",
    );
  }

  const { error } = await db
    .from("packages")
    .delete()
    .eq("id", id)
    .eq("event_id", eventId);
  if (error) err(`/admin/events/${eventId}?tab=packages`, error.message);

  revalidatePath(`/admin/events/${eventId}`);
  revalidatePath("/");
  redirect(`/admin/events/${eventId}?tab=packages&package_deleted=1`);
}

export async function movePackage(
  packageId: string,
  eventId: string,
  direction: "up" | "down",
  _formData: FormData,
) {
  await requireManager();
  const db = createAdminClient();

  if (!packageId || !eventId) {
    err(`/admin/events/${eventId}?tab=packages`, "ข้อมูลการย้ายลำดับไม่ถูกต้อง");
  }

  const { data, error } = await db
    .from("packages")
    .select("id, sort_order, created_at")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) err(`/admin/events/${eventId}?tab=packages`, error.message);

  const packages = data ?? [];
  const currentIndex = packages.findIndex((p) => p.id === packageId);
  const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
  if (currentIndex >= 0 && targetIndex >= 0 && targetIndex < packages.length) {
    [packages[currentIndex], packages[targetIndex]] = [packages[targetIndex], packages[currentIndex]];
    for (const [index, p] of packages.entries()) {
      if (p.sort_order === index) continue;
      const { error: updateError } = await db.from("packages").update({ sort_order: index }).eq("id", p.id);
      if (updateError) err(`/admin/events/${eventId}?tab=packages`, updateError.message);
    }
  }

  revalidatePath(`/admin/events/${eventId}`);
  revalidatePath("/");
  revalidatePath(`/events/${eventId}`);
  redirect(`/admin/events/${eventId}?tab=packages&package_reordered=1`);
}

// ---------- Submissions ----------

export async function reprocessSubmissionOcr(formData: FormData) {
  await requireAdmin();
  const db = createAdminClient();
  const id = String(formData.get("id") ?? "");

  if (!id) err("/admin/submissions", "ไม่พบรายการผลวิ่ง");

  const { data: submission, error } = await db
    .from("submissions")
    .select("distance_km, evidence_url, source")
    .eq("id", id)
    .single();
  if (error) err("/admin/submissions", error.message);
  if (!submission.evidence_url || submission.source !== "upload") {
    err("/admin/submissions", "รายการนี้ไม่มีรูปหลักฐานสำหรับตรวจ OCR");
  }

  const fileExtension = submission.evidence_url.split(".").pop()?.toLowerCase();
  const extension = fileExtension === "jpeg" ? "jpg" : fileExtension;
  if (extension !== "png" && extension !== "jpg" && extension !== "webp") {
    err("/admin/submissions", "ชนิดไฟล์หลักฐานไม่รองรับ OCR");
  }

  const { data: evidence, error: downloadError } = await db.storage
    .from("run-evidence")
    .download(submission.evidence_url);
  if (downloadError || !evidence) {
    err("/admin/submissions", downloadError?.message ?? "ดาวน์โหลดหลักฐานไม่สำเร็จ");
  }

  const ocr = await readRunEvidence(
    Buffer.from(await evidence.arrayBuffer()),
    extension,
    Number(submission.distance_km),
  );
  const { error: updateError } = await db
    .from("submissions")
    .update({
      ocr_status: ocr.status,
      ocr_distance_km: ocr.distanceKm,
      ocr_confidence: ocr.confidence,
      ocr_raw_text: ocr.rawText,
      ocr_processed_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (updateError) err("/admin/submissions", updateError.message);

  revalidatePath("/admin/submissions");
  redirect(`/admin/submissions?ocr_reprocessed=${ocr.status}`);
}

export async function reviewSubmission(formData: FormData) {
  const { user: reviewer } = await requireAdmin();
  const db = createAdminClient();

  const id = String(formData.get("id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const reviewNote = String(formData.get("review_note") ?? "").trim();

  if (
    !id ||
    (decision !== "pending" && decision !== "approve" && decision !== "reject")
  ) {
    err("/admin/submissions", "คำขอไม่ถูกต้อง");
  }
  const status =
    decision === "approve"
      ? "approved"
      : decision === "reject"
        ? "rejected"
        : "pending";

  const { data: submissionRaw, error } = await db
    .rpc("review_submission_guarded", {
      p_submission_id: id,
      p_reviewer_id: reviewer.id,
      p_status: status,
      p_review_note: reviewNote || null,
    })
    .single();
  if (error?.message === "duplicate_approval_reason_required") {
    err(
      "/admin/submissions",
      "การอนุมัติหลักฐานซ้ำแบบ normalized/perceptual ต้องระบุเหตุผลอย่างน้อย 10 ตัวอักษร",
    );
  }
  if (error) err("/admin/submissions", error.message);
  const submission = submissionRaw as GuardedReviewResult | null;
  if (!submission) err("/admin/submissions", "ไม่พบผลการตรวจที่บันทึก");

  if (
    status === "approved" &&
    submission.previous_status !== "approved" &&
    submission
  ) {
    await awardForApprovedSubmission(
      submission.registration_id,
      submission.user_id,
      Number(submission.distance_km),
      id,
    );
  }

  if (submission) {
    const notification =
      status === "approved"
        ? {
            subject: "ผลวิ่งของคุณได้รับการอนุมัติแล้ว",
            text: `ระยะ ${submission.distance_km} km ได้รับการอนุมัติแล้ว เพิ่มเข้ายอดสะสมของคุณเรียบร้อย`,
          }
        : status === "rejected"
          ? {
              subject: "ผลวิ่งของคุณถูกปฏิเสธ",
              text: `ผลวิ่งระยะ ${submission.distance_km} km ที่ส่งมาถูกปฏิเสธ ติดต่อผู้จัดงานถ้าคิดว่าเป็นความผิดพลาด`,
            }
          : {
              subject: "ผลวิ่งของคุณอยู่ระหว่างรอตรวจ",
              text: `ผลวิ่งระยะ ${submission.distance_km} km ถูกเปลี่ยนเป็นสถานะรอตรวจ เจ้าหน้าที่จะตรวจสอบอีกครั้ง`,
            };

    await notifyUser(submission.user_id, "submission_reviewed", {
      dedupeKey: `submission:${id}:${status}`,
      subject: notification.subject,
      text: notification.text,
    });
  }

  revalidatePath("/admin/submissions");
  revalidatePath("/dashboard");
  redirect(`/admin/submissions?reviewed=${status}`);
}

// ---------- Admins ----------

export async function setAdminRole(formData: FormData) {
  const { user } = await requireSuperAdmin();
  const db = createAdminClient();

  const id = String(formData.get("id") ?? "");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "") as AdminRole;
  if (!ADMIN_ROLES.includes(role)) err("/admin/admins", "ระดับสิทธิ์ไม่ถูกต้อง");
  if (!id && !email) err("/admin/admins", "กรอกอีเมล");

  const query = db.from("users").select("id, role");
  const { data: target } = id
    ? await query.eq("id", id).maybeSingle()
    : await query.eq("email", email).maybeSingle();

  if (!target) {
    err("/admin/admins", "ไม่พบผู้ใช้อีเมลนี้ — ต้องให้เขาสมัครสมาชิกก่อน");
  }

  if (target!.id === user.id && target!.role !== role) {
    err("/admin/admins", "ไม่สามารถเปลี่ยนระดับสิทธิ์ของบัญชีที่กำลังใช้งานได้");
  }

  const { error } = await db.from("users").update({ role }).eq("id", target!.id);
  if (error) err("/admin/admins", error.message);

  revalidatePath("/admin/admins");
  revalidatePath("/", "layout");
  redirect("/admin/admins?saved=1");
}

export async function removeAdminRole(formData: FormData) {
  const { user } = await requireSuperAdmin();
  const db = createAdminClient();

  const id = String(formData.get("id") ?? "");
  if (!id) err("/admin/admins", "ไม่พบผู้ใช้");

  if (id === user.id) {
    err("/admin/admins", "ไม่สามารถถอดสิทธิ์บัญชีที่กำลังใช้งานได้");
  }

  const { data: target } = await db.from("users").select("role").eq("id", id).maybeSingle();
  if (!target || !ADMIN_ROLES.includes(target.role as AdminRole)) {
    err("/admin/admins", "ไม่พบผู้ดูแลระบบหรือเจ้าหน้าที่");
  }

  if (target.role === "super_admin") {
    const { count } = await db
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("role", "super_admin");
    if ((count ?? 0) <= 1) {
      err("/admin/admins", "ต้องมีผู้ดูแลระบบสูงสุดเหลืออย่างน้อย 1 คน");
    }
  }

  const { error } = await db.from("users").update({ role: "user" }).eq("id", id);
  if (error) err("/admin/admins", error.message);

  revalidatePath("/admin/admins");
  revalidatePath("/", "layout");
  redirect("/admin/admins?demoted=1");
}

// ---------- Payments ----------

export async function confirmPayment(formData: FormData) {
  await requireAdmin();
  const db = createAdminClient();

  const paymentId = String(formData.get("payment_id") ?? "");
  const registrationId = String(formData.get("registration_id") ?? "");
  if (!paymentId || !registrationId) err("/admin/payments", "ไม่พบรายการชำระเงิน");

  const reviewResult = await db
    .rpc("review_payment", {
      p_payment_id: paymentId,
      p_registration_id: registrationId,
      p_decision: "confirm",
    })
    .single();
  if (reviewResult.error) err("/admin/payments", reviewResult.error.message);
  const review = reviewResult.data as {
    user_id: string;
    bib_number: string | null;
    changed: boolean;
  } | null;

  if (review?.changed) {
    await notifyUser(review.user_id, "payment_confirmed", {
      dedupeKey: `payment:${paymentId}:confirmed`,
      subject: "ยืนยันการชำระเงินสำเร็จ",
      text: `ชำระเงินสำเร็จแล้ว หมายเลข BIB ของคุณคือ ${review.bib_number}`,
    });
  }

  revalidatePath("/admin/payments");
  revalidatePath("/admin/dashboard");
  redirect("/admin/payments?confirmed=1");
}

export async function rejectPayment(formData: FormData) {
  await requireAdmin();
  const db = createAdminClient();

  const paymentId = String(formData.get("payment_id") ?? "");
  const registrationId = String(formData.get("registration_id") ?? "");
  if (!paymentId || !registrationId) err("/admin/payments", "ไม่พบรายการชำระเงิน");

  const { error } = await db.rpc("review_payment", {
    p_payment_id: paymentId,
    p_registration_id: registrationId,
    p_decision: "reject",
  });
  if (error) err("/admin/payments", error.message);

  revalidatePath("/admin/payments");
  revalidatePath("/admin/dashboard");
  redirect("/admin/payments?rejected=1");
}
// ---------- Medals ----------

export async function createMedal(formData: FormData) {
  await requireManager();
  const db = createAdminClient();

  const eventId = String(formData.get("event_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const name_en = String(formData.get("name_en") ?? "").trim() || null;
  const tier = String(formData.get("tier") ?? "bronze");
  const targetKm = Number(formData.get("target_km") ?? 0);
  const bonusPoints = Number(formData.get("bonus_points") ?? 0);

  if (!eventId || !name || targetKm <= 0) {
    err(`/admin/events/${eventId}?tab=medals`, "กรอกชื่อเหรียญและระยะเป้าหมายให้ถูกต้อง");
  }

  let imageUrl: string | null = null;
  try {
    imageUrl = await uploadEventImage(db, formData.get("image_url_file"), "medals");
  } catch (e) {
    err(`/admin/events/${eventId}?tab=medals`, (e as Error).message);
  }

  const { data: lastMedal } = await db
    .from("medals")
    .select("sort_order")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const sortOrder = (lastMedal?.sort_order ?? -1) + 1;

  const { error } = await db.from("medals").insert({
    event_id: eventId,
    name,
    name_en,
    tier,
    unlock_rule: { type: "distance", target_km: targetKm },
    bonus_points: bonusPoints,
    image_url: imageUrl,
    sort_order: sortOrder,
  });
  if (error) err(`/admin/events/${eventId}?tab=medals`, error.message);

  revalidatePath(`/admin/events/${eventId}`);
  redirect(`/admin/events/${eventId}?tab=medals&medal_added=1`);
}

export async function updateMedal(formData: FormData) {
  await requireManager();
  const db = createAdminClient();

  const id = String(formData.get("id") ?? "");
  const eventId = String(formData.get("event_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const name_en = String(formData.get("name_en") ?? "").trim() || null;
  const tier = String(formData.get("tier") ?? "bronze");
  const targetKm = Number(formData.get("target_km") ?? 0);
  const bonusPoints = Number(formData.get("bonus_points") ?? 0);

  if (!id || !eventId || !name || targetKm <= 0) {
    err(`/admin/events/${eventId}?tab=medals`, "กรอกชื่อเหรียญและระยะเป้าหมายให้ถูกต้อง");
  }

  let imageUrl = String(formData.get("existing_image_url") ?? "").trim() || null;
  try {
    const uploaded = await uploadEventImage(db, formData.get("image_url_file"), "medals");
    if (uploaded) imageUrl = uploaded;
  } catch (e) {
    err(`/admin/events/${eventId}?tab=medals`, (e as Error).message);
  }

  const { error } = await db
    .from("medals")
    .update({
      name,
      name_en,
      tier,
      unlock_rule: { type: "distance", target_km: targetKm },
      bonus_points: bonusPoints,
      image_url: imageUrl,
    })
    .eq("id", id);
  if (error) err(`/admin/events/${eventId}?tab=medals`, error.message);

  revalidatePath(`/admin/events/${eventId}`);
  redirect(`/admin/events/${eventId}?tab=medals&medal_saved=1`);
}

export async function moveMedal(
  medalId: string,
  eventId: string,
  direction: "up" | "down",
  _formData: FormData,
) {
  await requireManager();
  const db = createAdminClient();

  if (!medalId || !eventId) {
    err(`/admin/events/${eventId}?tab=medals`, "ข้อมูลการย้ายลำดับไม่ถูกต้อง");
  }

  const { data, error } = await db
    .from("medals")
    .select("id, sort_order")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });
  if (error) err(`/admin/events/${eventId}?tab=medals`, error.message);

  const medals = data ?? [];
  const currentIndex = medals.findIndex((m) => m.id === medalId);
  const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
  if (currentIndex >= 0 && targetIndex >= 0 && targetIndex < medals.length) {
    [medals[currentIndex], medals[targetIndex]] = [medals[targetIndex], medals[currentIndex]];
    for (const [index, m] of medals.entries()) {
      if (m.sort_order === index) continue;
      const { error: updateError } = await db.from("medals").update({ sort_order: index }).eq("id", m.id);
      if (updateError) err(`/admin/events/${eventId}?tab=medals`, updateError.message);
    }
  }

  revalidatePath(`/admin/events/${eventId}`);
  revalidatePath("/dashboard/medals");
  redirect(`/admin/events/${eventId}?tab=medals&medal_reordered=1`);
}

export async function deleteMedal(formData: FormData) {
  await requireManager();
  const db = createAdminClient();

  const id = String(formData.get("id") ?? "");
  const eventId = String(formData.get("event_id") ?? "");

  if (!id || !eventId) {
    err("/admin/events/" + eventId + "?tab=medals", "ไม่พบเหรียญที่ต้องการลบ");
  }

  const { error } = await db
    .from("medals")
    .delete()
    .eq("id", id)
    .eq("event_id", eventId);
  if (error) err("/admin/events/" + eventId + "?tab=medals", error.message);

  revalidatePath("/admin/events/" + eventId);
  revalidatePath("/dashboard/medals");
  redirect("/admin/events/" + eventId + "?tab=medals&medal_deleted=1");
}

// ---------- Physical medals ----------

export async function createPhysicalMedal(formData: FormData) {
  await requireManager();
  const db = createAdminClient();

  const eventId = String(formData.get("event_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const name_en = String(formData.get("name_en") ?? "").trim() || null;
  const description_en = String(formData.get("description_en") ?? "").trim() || null;
  const tier = String(formData.get("tier") ?? "bronze");
  const targetKm = Number(formData.get("target_km") ?? 0);
  const bonusPoints = Number(formData.get("bonus_points") ?? 0);

  if (!eventId || !name || targetKm <= 0) {
    err(
      `/admin/events/${eventId}?tab=physical-medals`,
      "กรอกชื่อเหรียญจริงและระยะเป้าหมายให้ถูกต้อง",
    );
  }

  let imageUrl: string | null = null;
  try {
    imageUrl = await uploadEventImage(db, formData.get("image_url_file"), "physical-medals");
  } catch (e) {
    err(`/admin/events/${eventId}?tab=physical-medals`, (e as Error).message);
  }

  const { data: lastPhysicalMedal } = await db
    .from("physical_medals")
    .select("sort_order")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const sortOrder = (lastPhysicalMedal?.sort_order ?? -1) + 1;

  const { error } = await db.from("physical_medals").insert({
    event_id: eventId,
    name,
    name_en,
    description_en,
    tier,
    unlock_rule: { type: "distance", target_km: targetKm },
    bonus_points: bonusPoints,
    image_url: imageUrl,
    sort_order: sortOrder,
  });
  if (error) err(`/admin/events/${eventId}?tab=physical-medals`, error.message);

  revalidatePath(`/admin/events/${eventId}`);
  redirect(`/admin/events/${eventId}?tab=physical-medals&physical_medal_added=1`);
}

export async function updatePhysicalMedal(formData: FormData) {
  await requireManager();
  const db = createAdminClient();

  const id = String(formData.get("id") ?? "");
  const eventId = String(formData.get("event_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const name_en = String(formData.get("name_en") ?? "").trim() || null;
  const description_en = String(formData.get("description_en") ?? "").trim() || null;
  const tier = String(formData.get("tier") ?? "bronze");
  const targetKm = Number(formData.get("target_km") ?? 0);
  const bonusPoints = Number(formData.get("bonus_points") ?? 0);

  if (!id || !eventId || !name || targetKm <= 0) {
    err(
      `/admin/events/${eventId}?tab=physical-medals`,
      "กรอกชื่อเหรียญจริงและระยะเป้าหมายให้ถูกต้อง",
    );
  }

  let imageUrl = String(formData.get("existing_image_url") ?? "").trim() || null;
  try {
    const uploaded = await uploadEventImage(db, formData.get("image_url_file"), "physical-medals");
    if (uploaded) imageUrl = uploaded;
  } catch (e) {
    err(`/admin/events/${eventId}?tab=physical-medals`, (e as Error).message);
  }

  const { error } = await db
    .from("physical_medals")
    .update({
      name,
      name_en,
      description_en,
      tier,
      unlock_rule: { type: "distance", target_km: targetKm },
      bonus_points: bonusPoints,
      image_url: imageUrl,
    })
    .eq("id", id)
    .eq("event_id", eventId);
  if (error) err(`/admin/events/${eventId}?tab=physical-medals`, error.message);

  revalidatePath(`/admin/events/${eventId}`);
  revalidatePath(`/events/${eventId}`);
  redirect(`/admin/events/${eventId}?tab=physical-medals&physical_medal_saved=1`);
}

export async function movePhysicalMedal(
  medalId: string,
  eventId: string,
  direction: "up" | "down",
  _formData: FormData,
) {
  await requireManager();
  const db = createAdminClient();

  if (!medalId || !eventId) {
    err(`/admin/events/${eventId}?tab=physical-medals`, "ข้อมูลการย้ายลำดับไม่ถูกต้อง");
  }

  const { data, error } = await db
    .from("physical_medals")
    .select("id, sort_order")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });
  if (error) err(`/admin/events/${eventId}?tab=physical-medals`, error.message);

  const physicalMedals = data ?? [];
  const currentIndex = physicalMedals.findIndex((m) => m.id === medalId);
  const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
  if (currentIndex >= 0 && targetIndex >= 0 && targetIndex < physicalMedals.length) {
    [physicalMedals[currentIndex], physicalMedals[targetIndex]] = [
      physicalMedals[targetIndex],
      physicalMedals[currentIndex],
    ];
    for (const [index, m] of physicalMedals.entries()) {
      if (m.sort_order === index) continue;
      const { error: updateError } = await db
        .from("physical_medals")
        .update({ sort_order: index })
        .eq("id", m.id);
      if (updateError) err(`/admin/events/${eventId}?tab=physical-medals`, updateError.message);
    }
  }

  revalidatePath(`/admin/events/${eventId}`);
  revalidatePath(`/events/${eventId}`);
  redirect(`/admin/events/${eventId}?tab=physical-medals&physical_medal_reordered=1`);
}

export async function deletePhysicalMedal(formData: FormData) {
  await requireManager();
  const db = createAdminClient();

  const id = String(formData.get("id") ?? "");
  const eventId = String(formData.get("event_id") ?? "");
  if (!id || !eventId) {
    err(`/admin/events/${eventId}?tab=physical-medals`, "ไม่พบเหรียญจริงที่ต้องการลบ");
  }

  const { error: packageError } = await db
    .from("packages")
    .update({ has_physical_medal: false, physical_medal_id: null })
    .eq("physical_medal_id", id)
    .eq("event_id", eventId);
  if (packageError) err(`/admin/events/${eventId}?tab=physical-medals`, packageError.message);

  const { error } = await db
    .from("physical_medals")
    .delete()
    .eq("id", id)
    .eq("event_id", eventId);
  if (error) err(`/admin/events/${eventId}?tab=physical-medals`, error.message);

  revalidatePath(`/admin/events/${eventId}`);
  revalidatePath(`/events/${eventId}`);
  redirect(`/admin/events/${eventId}?tab=physical-medals&physical_medal_deleted=1`);
}

// ---------- Rewards ----------

export async function createReward(formData: FormData) {
  await requireManager();
  const db = createAdminClient();

  const name = String(formData.get("name") ?? "").trim();
  const name_en = String(formData.get("name_en") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;
  const description_en = String(formData.get("description_en") ?? "").trim() || null;
  const costPoints = Number(formData.get("cost_points") ?? 0);
  const stock = Number(formData.get("stock") ?? 0);

  if (!name || costPoints <= 0) {
    err("/admin/rewards?create=1", "กรอกชื่อรางวัลและแต้มให้ถูกต้อง");
  }

  let imageUrl: string | null = null;
  try {
    imageUrl = await uploadEventImage(db, formData.get("image_file"), "rewards");
  } catch (e) {
    err("/admin/rewards?create=1", (e as Error).message);
  }

  const { error } = await db.from("rewards").insert({
    name,
    name_en,
    description,
    description_en,
    image_url: imageUrl,
    cost_points: costPoints,
    stock,
  });
  if (error) err("/admin/rewards?create=1", error.message);

  revalidatePath("/admin/rewards");
  revalidatePath("/rewards");
  revalidatePath("/dashboard/rewards");
  redirect("/admin/rewards?reward_added=1");
}

export async function updateReward(formData: FormData) {
  await requireManager();
  const db = createAdminClient();

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const name_en = String(formData.get("name_en") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;
  const description_en = String(formData.get("description_en") ?? "").trim() || null;
  const costPoints = Number(formData.get("cost_points") ?? 0);
  const stock = Number(formData.get("stock") ?? 0);

  if (!id || !name || costPoints <= 0) {
    err(`/admin/rewards?tab=catalog&edit=${id}`, "กรอกชื่อรางวัลและแต้มให้ถูกต้อง");
  }

  let imageUrl = String(formData.get("existing_image_url") ?? "").trim() || null;
  try {
    const uploaded = await uploadEventImage(db, formData.get("image_file"), "rewards");
    if (uploaded) imageUrl = uploaded;
  } catch (e) {
    err(`/admin/rewards?tab=catalog&edit=${id}`, (e as Error).message);
  }

  const { error } = await db
    .from("rewards")
    .update({ name, name_en, description, description_en, image_url: imageUrl, cost_points: costPoints, stock })
    .eq("id", id);
  if (error) err(`/admin/rewards?tab=catalog&edit=${id}`, error.message);

  revalidatePath("/admin/rewards");
  revalidatePath("/rewards");
  revalidatePath("/dashboard/rewards");
  redirect("/admin/rewards?reward_saved=1");
}

export async function deleteReward(formData: FormData) {
  await requireManager();
  const db = createAdminClient();
  const id = String(formData.get("id") ?? "");

  if (!id) err("/admin/rewards", "ไม่พบรางวัลที่ต้องการลบ");

  const { count: redemptionCount, error: countError } = await db
    .from("redemptions")
    .select("id", { count: "exact", head: true })
    .eq("reward_id", id);
  if (countError) err("/admin/rewards", countError.message);
  if ((redemptionCount ?? 0) > 0) {
    err(
      "/admin/rewards",
      "ไม่สามารถลบรางวัลที่มีประวัติการแลกแล้วได้ กรุณาปรับ stock เป็น 0 เพื่อปิดการแลกแทน",
    );
  }

  const { error } = await db.from("rewards").delete().eq("id", id);
  if (error) err("/admin/rewards", error.message);

  revalidatePath("/admin/rewards");
  revalidatePath("/rewards");
  revalidatePath("/dashboard/rewards");
  redirect("/admin/rewards?reward_deleted=1");
}

export async function fulfillRedemption(formData: FormData) {
  await requireManager();
  const db = createAdminClient();

  const id = String(formData.get("id") ?? "");
  if (!id) err("/admin/rewards", "ไม่พบรายการแลกรางวัล");

  const { data: redemption, error } = await db
    .from("redemptions")
    .update({ status: "fulfilled" })
    .eq("id", id)
    .eq("status", "pending")
    .select("user_id, rewards(name)")
    .maybeSingle();
  if (error) err("/admin/rewards", error.message);

  if (redemption) {
    const reward = redemption.rewards as unknown as { name: string } | { name: string }[] | null;
    const rewardName = Array.isArray(reward) ? reward[0]?.name : reward?.name;
    await notifyUser(redemption.user_id, "redemption_fulfilled", {
      dedupeKey: `redemption:${id}:fulfilled`,
      subject: "รางวัลของคุณพร้อมส่งมอบแล้ว",
      text: `รางวัล "${rewardName ?? ""}" ที่คุณแลกไว้พร้อมส่งมอบ/รับได้แล้ว`,
    });
  }

  revalidatePath("/admin/rewards");
  redirect("/admin/rewards?fulfilled=1");
}

// ---------- Hero Banners ----------

const HERO_BANNER_CONTENT_LIMITS = [
  ["kicker", 120, "ข้อความนำภาษาไทย"],
  ["kicker_en", 120, "ข้อความนำภาษาอังกฤษ"],
  ["title", 160, "หัวข้อหลักภาษาไทย"],
  ["title_en", 160, "หัวข้อหลักภาษาอังกฤษ"],
  ["highlight", 160, "ข้อความไฮไลต์ภาษาไทย"],
  ["highlight_en", 160, "ข้อความไฮไลต์ภาษาอังกฤษ"],
  ["title_suffix", 160, "ข้อความต่อท้ายภาษาไทย"],
  ["title_suffix_en", 160, "ข้อความต่อท้ายภาษาอังกฤษ"],
  ["subtitle", 1000, "คำอธิบายภาษาไทย"],
  ["subtitle_en", 1000, "คำอธิบายภาษาอังกฤษ"],
] as const;

function readHeroBannerContent(formData: FormData) {
  const content = Object.fromEntries(
    HERO_BANNER_CONTENT_LIMITS.map(([field]) => [
      field,
      String(formData.get(field) ?? "").trim(),
    ]),
  ) as Record<(typeof HERO_BANNER_CONTENT_LIMITS)[number][0], string>;

  for (const [field, maximum, label] of HERO_BANNER_CONTENT_LIMITS) {
    const value = content[field];
    if (!value || value.length > maximum) {
      err(
        "/admin/hero-banners",
        `${label}ต้องมีความยาว 1–${maximum.toLocaleString("th-TH")} ตัวอักษร`,
      );
    }
  }

  return content;
}

export async function createHeroBanner(formData: FormData) {
  await requireManager();
  const db = createAdminClient();

  const content = readHeroBannerContent(formData);
  const link_url = String(formData.get("link_url") ?? "").trim();
  const is_active = formData.get("is_active") === "on";
  const position_x = parseImagePosition(formData.get("position_x"));
  const position_y = parseImagePosition(formData.get("position_y"));

  const { data: lastBanner, error: orderError } = await db
    .from("hero_banners")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (orderError) err("/admin/hero-banners", orderError.message);
  const sort_order = (lastBanner?.sort_order ?? -1) + 1;

  let image_url: string | null = null;
  try {
    image_url = await uploadEventImage(db, formData.get("image_file"), "hero");
  } catch (e) {
    err("/admin/hero-banners", (e as Error).message);
  }
  if (!image_url) {
    err("/admin/hero-banners", "ต้องแนบรูปสำหรับ banner");
  }

  const { error } = await db.from("hero_banners").insert({
    image_url,
    ...content,
    link_url: link_url || null,
    position_x,
    position_y,
    sort_order,
    is_active,
  });
  if (error) err("/admin/hero-banners", error.message);

  revalidatePath("/admin/hero-banners");
  revalidatePath("/");
  redirect("/admin/hero-banners?created=1");
}

export async function updateHeroBanner(formData: FormData) {
  await requireManager();
  const db = createAdminClient();

  const id = String(formData.get("id") ?? "");
  const content = readHeroBannerContent(formData);
  const link_url = String(formData.get("link_url") ?? "").trim();
  const is_active = formData.get("is_active") === "on";
  const position_x = parseImagePosition(formData.get("position_x"));
  const position_y = parseImagePosition(formData.get("position_y"));

  if (!id) err("/admin/hero-banners", "ไม่พบ banner");

  // ถ้าไม่ได้เลือกไฟล์ใหม่ ใช้รูปเดิมต่อ (ส่งมาจาก hidden field ในฟอร์ม)
  let image_url = String(formData.get("existing_image_url") ?? "").trim() || null;
  try {
    const uploaded = await uploadEventImage(db, formData.get("image_file"), "hero");
    if (uploaded) image_url = uploaded;
  } catch (e) {
    err("/admin/hero-banners", (e as Error).message);
  }

  const { error } = await db
    .from("hero_banners")
    .update({
      image_url,
      ...content,
      link_url: link_url || null,
      position_x,
      position_y,
      is_active,
    })
    .eq("id", id);
  if (error) err("/admin/hero-banners", error.message);

  revalidatePath("/admin/hero-banners");
  revalidatePath("/");
  redirect("/admin/hero-banners?saved=1");
}

export async function moveHeroBanner(
  id: string,
  direction: "up" | "down",
  _formData: FormData,
) {
  await requireManager();
  const db = createAdminClient();
  if (!id) {
    err("/admin/hero-banners", "ข้อมูลการย้ายลำดับไม่ถูกต้อง");
  }
  const { data, error } = await db
    .from("hero_banners")
    .select("id, sort_order, created_at")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) err("/admin/hero-banners", error.message);
  const banners = data ?? [];
  const currentIndex = banners.findIndex((banner) => banner.id === id);
  const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
  if (currentIndex >= 0 && targetIndex >= 0 && targetIndex < banners.length) {
    [banners[currentIndex], banners[targetIndex]] = [banners[targetIndex], banners[currentIndex]];
    for (const [index, banner] of banners.entries()) {
      if (banner.sort_order === index) continue;
      const { error: updateError } = await db.from("hero_banners").update({ sort_order: index }).eq("id", banner.id);
      if (updateError) err("/admin/hero-banners", updateError.message);
    }
  }
  revalidatePath("/admin/hero-banners");
  revalidatePath("/");
  redirect("/admin/hero-banners?reordered=1");
}
export async function deleteHeroBanner(formData: FormData) {
  await requireManager();
  const db = createAdminClient();

  const id = String(formData.get("id") ?? "");
  if (!id) err("/admin/hero-banners", "ไม่พบ banner");

  const { error } = await db.from("hero_banners").delete().eq("id", id);
  if (error) err("/admin/hero-banners", error.message);

  revalidatePath("/admin/hero-banners");
  revalidatePath("/");
  redirect("/admin/hero-banners?deleted=1");
}

// ---------- System Settings ----------

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;
const MAX_CONTENT_BACKGROUND_INSET = 2000;

function parseContentBackgroundInset(value: FormDataEntryValue | null): number {
  const inset = Number(value ?? 0);
  return Number.isInteger(inset) ? inset : Number.NaN;
}

export async function updateSystemSettings(formData: FormData) {
  await requireSuperAdmin();
  const db = createAdminClient();

  const site_name = String(formData.get("site_name") ?? "").trim();
  const site_name_en = String(formData.get("site_name_en") ?? "").trim() || null;
  const header_show_site_name = formData.get("header_show_site_name") === "on";
  const color_ink = String(formData.get("color_ink") ?? "").trim();
  const color_primary = String(formData.get("color_primary") ?? "").trim();
  const color_accent = String(formData.get("color_accent") ?? "").trim();
  const color_medal = String(formData.get("color_medal") ?? "").trim();
  const cookie_consent_enabled = formData.get("cookie_consent_enabled") === "on";
  const cookie_consent_message_input = String(
    formData.get("cookie_consent_message") ?? "",
  ).trim();
  const cookie_consent_message = sanitizeCookieConsentHtml(cookie_consent_message_input);
  const cookie_consent_message_en_input = String(formData.get("cookie_consent_message_en") ?? "").trim();
  const cookie_consent_message_en = cookie_consent_message_en_input
    ? sanitizeCookieConsentHtml(cookie_consent_message_en_input)
    : null;
  const cookie_policy_url = String(formData.get("cookie_policy_url") ?? "").trim();
  const cookie_consent_button_label = String(
    formData.get("cookie_consent_button_label") ?? "",
  ).trim();
  const cookie_consent_button_label_en = String(
    formData.get("cookie_consent_button_label_en") ?? "",
  ).trim() || null;
  const privacy_policy_text = String(formData.get("privacy_policy_text") ?? "").trim();
  const privacy_policy_text_en = String(formData.get("privacy_policy_text_en") ?? "").trim();
  const content_overlay_color = String(formData.get("content_overlay_color") ?? "").trim();
  const content_overlay_opacity = Number(formData.get("content_overlay_opacity"));
  const submission_max_distance_km = Number(
    formData.get("submission_max_distance_km"),
  );
  const submission_daily_limit = Number(formData.get("submission_daily_limit"));
  const content_background_position_x = parseImagePosition(
    formData.get("content_background_position_x"),
  );
  const content_background_position_y = parseImagePosition(
    formData.get("content_background_position_y"),
  );
  const content_background_display = String(
    formData.get("content_background_display") ?? "cover",
  );
  const content_background_inset_top = parseContentBackgroundInset(
    formData.get("content_background_inset_top"),
  );
  const content_background_inset_bottom = parseContentBackgroundInset(
    formData.get("content_background_inset_bottom"),
  );
  const remove_content_background = formData.get("remove_content_background") === "on";

  if (!site_name) err("/admin/settings", "กรุณากรอกชื่อระบบ");
  for (const c of [color_ink, color_primary, color_accent, color_medal]) {
    if (!HEX_COLOR.test(c)) err("/admin/settings", "รูปแบบสีไม่ถูกต้อง (ต้องเป็น #RRGGBB)");
  }
  if (
    !hasCookieConsentText(cookie_consent_message) ||
    cookie_consent_message_input.length > 1000
  ) {
    err("/admin/settings", "ข้อความ Cookie Consent ต้องมีความยาว 1–1,000 ตัวอักษร");
  }
  if (!cookie_consent_button_label || cookie_consent_button_label.length > 50) {
    err("/admin/settings", "ข้อความบนปุ่มยอมรับต้องมีความยาว 1–50 ตัวอักษร");
  }
  if (!privacy_policy_text || privacy_policy_text.length > 20000) {
    err("/admin/settings", "นโยบายความเป็นส่วนตัวภาษาไทยต้องมีความยาว 1–20,000 ตัวอักษร");
  }
  if (!privacy_policy_text_en || privacy_policy_text_en.length > 20000) {
    err("/admin/settings", "นโยบายความเป็นส่วนตัวภาษาอังกฤษต้องมีความยาว 1–20,000 ตัวอักษร");
  }
  if (cookie_policy_url.length > 2048) {
    err("/admin/settings", "URL นโยบาย Cookie ยาวเกินไป");
  }
  if (
    cookie_policy_url &&
    !cookie_policy_url.startsWith("/") &&
    !cookie_policy_url.startsWith("https://") &&
    !cookie_policy_url.startsWith("http://")
  ) {
    err("/admin/settings", "URL นโยบาย Cookie ต้องขึ้นต้นด้วย /, https:// หรือ http://");
  }
  if (!HEX_COLOR.test(content_overlay_color)) {
    err("/admin/settings", "รูปแบบสี Overlay ไม่ถูกต้อง (ต้องเป็น #RRGGBB)");
  }
  if (
    !Number.isInteger(content_overlay_opacity) ||
    content_overlay_opacity < 0 ||
    content_overlay_opacity > 100
  ) {
    err("/admin/settings", "Opacity ของ Overlay ต้องอยู่ระหว่าง 0–100");
  }
  if (
    !Number.isFinite(submission_max_distance_km) ||
    submission_max_distance_km < 0.1 ||
    submission_max_distance_km > 1000
  ) {
    err("/admin/settings", "ระยะสูงสุดต่อครั้งต้องอยู่ระหว่าง 0.1–1,000 กม.");
  }
  if (
    !Number.isInteger(submission_daily_limit) ||
    submission_daily_limit < 1 ||
    submission_daily_limit > 50
  ) {
    err("/admin/settings", "จำนวนส่งผลสูงสุดต่อวันต้องเป็นจำนวนเต็มระหว่าง 1–50");
  }
  if (!CONTENT_BACKGROUND_DISPLAYS.some((mode) => mode === content_background_display)) {
    err("/admin/settings", "รูปแบบการแสดงพื้นหลังไม่ถูกต้อง");
  }
  for (const inset of [content_background_inset_top, content_background_inset_bottom]) {
    if (inset < 0 || inset > MAX_CONTENT_BACKGROUND_INSET || !Number.isInteger(inset)) {
      err("/admin/settings", "ระยะเว้นด้านบนและด้านล่างต้องเป็นจำนวนเต็มระหว่าง 0–2,000 px");
    }
  }

  const update: Record<string, unknown> = {
    site_name,
    site_name_en,
    header_show_site_name,
    color_ink,
    color_primary,
    color_accent,
    color_medal,
    cookie_consent_enabled,
    cookie_consent_message,
    cookie_consent_message_en,
    cookie_policy_url,
    cookie_consent_button_label,
    cookie_consent_button_label_en,
    privacy_policy_text,
    privacy_policy_text_en,
    content_background_position_x,
    content_background_position_y,
    content_background_display,
    content_background_inset_top,
    content_background_inset_bottom,
    content_overlay_color,
    content_overlay_opacity,
    submission_max_distance_km,
    submission_daily_limit,
  };

  try {
    const logo_url = await uploadEventFile(db, formData.get("logo_file"), "system-assets", "branding");
    if (logo_url) update.logo_url = logo_url;
    const favicon_url = await uploadEventFile(
      db,
      formData.get("favicon_file"),
      "system-assets",
      "branding",
    );
    if (favicon_url) update.favicon_url = favicon_url;
    if (remove_content_background) {
      update.content_background_url = null;
    } else {
      const content_background_url = await uploadEventFile(
        db,
        formData.get("content_background_file"),
        "system-assets",
        "backgrounds",
      );
      if (content_background_url) update.content_background_url = content_background_url;
    }
  } catch (e) {
    err("/admin/settings", (e as Error).message);
  }

  const { error } = await db.from("system_settings").update(update).eq("id", 1);
  if (error) err("/admin/settings", error.message);

  // ธีม/ชื่อ/โลโก้ฉีดจาก root layout ซึ่งครอบทุกหน้า — revalidate ที่ layout ให้มีผลทันทีทั้งเว็บ
  revalidatePath("/", "layout");
  redirect("/admin/settings?saved=1");
}
