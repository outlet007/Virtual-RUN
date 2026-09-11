"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSuperAdmin } from "@/lib/auth/admin";
import {
  isLegalDocumentKey,
  LEGAL_DOCUMENT_CONFIG,
  normalizeLegalRichText,
  normalizeLegalText,
  validateLegalContactText,
  validateLegalHeaderSubtitle,
  validateLegalHeaderTitle,
  validateLegalText,
  type LegalDocumentKey,
} from "@/lib/legal-settings";
import { createAdminClient } from "@/lib/supabase/admin";

function legalEditorPath(document: LegalDocumentKey, key: "error" | "saved", value: string) {
  const params = new URLSearchParams({ tab: document, [key]: value });
  return `/admin/legal?${params.toString()}`;
}

function fail(document: LegalDocumentKey, message: string): never {
  redirect(legalEditorPath(document, "error", message));
}

export async function updateLegalDocument(formData: FormData) {
  await requireSuperAdmin();

  const requestedDocument = formData.get("document");
  const document = isLegalDocumentKey(requestedDocument) ? requestedDocument : "privacy";
  const titleTh = normalizeLegalText(formData.get("title_th"));
  const titleEn = normalizeLegalText(formData.get("title_en"));
  const subtitleTh = normalizeLegalText(formData.get("subtitle_th"));
  const subtitleEn = normalizeLegalText(formData.get("subtitle_en"));
  const thaiText = normalizeLegalRichText(formData.get("text_th"));
  const englishText = normalizeLegalRichText(formData.get("text_en"));

  const titleThaiError = validateLegalHeaderTitle(titleTh);
  if (titleThaiError) fail(document, titleThaiError);
  const titleEnglishError = validateLegalHeaderTitle(titleEn);
  if (titleEnglishError) fail(document, titleEnglishError);
  const subtitleThaiError = validateLegalHeaderSubtitle(subtitleTh);
  if (subtitleThaiError) fail(document, subtitleThaiError);
  const subtitleEnglishError = validateLegalHeaderSubtitle(subtitleEn);
  if (subtitleEnglishError) fail(document, subtitleEnglishError);

  const thaiError = validateLegalText(thaiText);
  if (thaiError) fail(document, thaiError);
  const englishError = validateLegalText(englishText);
  if (englishError) fail(document, englishError);

  const contactTextTh = normalizeLegalText(formData.get("contact_text_th"));
  const contactTextEn = normalizeLegalText(formData.get("contact_text_en"));
  const contactThaiError = validateLegalContactText(contactTextTh);
  if (contactThaiError) fail(document, contactThaiError);
  const contactEnglishError = validateLegalContactText(contactTextEn);
  if (contactEnglishError) fail(document, contactEnglishError);

  const config = LEGAL_DOCUMENT_CONFIG[document];
  const updates: Record<string, string> = {
    [config.titleThaiField]: titleTh,
    [config.titleEnglishField]: titleEn,
    [config.subtitleThaiField]: subtitleTh,
    [config.subtitleEnglishField]: subtitleEn,
    [config.thaiField]: thaiText,
    [config.englishField]: englishText,
    [config.contactThaiField]: contactTextTh,
    [config.contactEnglishField]: contactTextEn,
    updated_at: new Date().toISOString(),
  };
  const db = createAdminClient();
  const { error } = await db
    .from("system_settings")
    .update(updates)
    .eq("id", 1);

  if (error) fail(document, error.message);

  revalidatePath(config.publicPath);
  revalidatePath("/admin/legal");
  if (document === "privacy") revalidatePath("/signup");
  redirect(legalEditorPath(document, "saved", "1"));
}
