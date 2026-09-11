import sanitizeHtml from "sanitize-html";
import type { Locale } from "./i18n/shared.ts";
import { sanitizeContentHtml } from "./content.ts";
import {
  DATA_DELETION_INSTRUCTIONS,
  LEGAL_LAST_UPDATED,
  PRIVACY_NOTICE,
  TERMS_OF_SERVICE,
  type PublicLegalDocument,
} from "./public-legal-pages.ts";

export const LEGAL_DOCUMENT_KEYS = ["privacy", "terms", "data-deletion"] as const;
export type LegalDocumentKey = (typeof LEGAL_DOCUMENT_KEYS)[number];

export const LEGAL_DOCUMENT_CONFIG = {
  privacy: {
    document: PRIVACY_NOTICE,
    thaiField: "privacy_policy_text",
    englishField: "privacy_policy_text_en",
    titleThaiField: "privacy_header_title",
    titleEnglishField: "privacy_header_title_en",
    subtitleThaiField: "privacy_header_subtitle",
    subtitleEnglishField: "privacy_header_subtitle_en",
    contactThaiField: "privacy_contact_text",
    contactEnglishField: "privacy_contact_text_en",
    publicPath: "/privacy",
  },
  terms: {
    document: TERMS_OF_SERVICE,
    thaiField: "terms_of_service_text",
    englishField: "terms_of_service_text_en",
    titleThaiField: "terms_header_title",
    titleEnglishField: "terms_header_title_en",
    subtitleThaiField: "terms_header_subtitle",
    subtitleEnglishField: "terms_header_subtitle_en",
    contactThaiField: "terms_contact_text",
    contactEnglishField: "terms_contact_text_en",
    publicPath: "/terms",
  },
  "data-deletion": {
    document: DATA_DELETION_INSTRUCTIONS,
    thaiField: "data_deletion_text",
    englishField: "data_deletion_text_en",
    titleThaiField: "data_deletion_header_title",
    titleEnglishField: "data_deletion_header_title_en",
    subtitleThaiField: "data_deletion_header_subtitle",
    subtitleEnglishField: "data_deletion_header_subtitle_en",
    contactThaiField: "data_deletion_contact_text",
    contactEnglishField: "data_deletion_contact_text_en",
    publicPath: "/data-deletion",
  },
} as const;

export const MAX_LEGAL_TEXT_LENGTH = 20_000;
export const MAX_LEGAL_CONTACT_TEXT_LENGTH = 2_000;
export const MAX_LEGAL_HEADER_TITLE_LENGTH = 240;
export const MAX_LEGAL_HEADER_SUBTITLE_LENGTH = 500;

export const DEFAULT_LEGAL_HEADERS = {
  privacy: { title: PRIVACY_NOTICE.title, subtitle: PRIVACY_NOTICE.summary },
  terms: { title: TERMS_OF_SERVICE.title, subtitle: TERMS_OF_SERVICE.summary },
  "data-deletion": {
    title: DATA_DELETION_INSTRUCTIONS.title,
    subtitle: DATA_DELETION_INSTRUCTIONS.summary,
  },
} as const;

export const DEFAULT_LEGAL_CONTACT_TEXTS = {
  privacy: {
    th: "คุณสามารถติดต่อผู้ดูแลระบบเพื่อขอเข้าถึง แก้ไข หรือลบข้อมูลส่วนบุคคลของคุณได้",
    en: "You may contact the administrator to request access to, correction of, or deletion of your personal information.",
  },
  terms: {
    th: "หากมีคำถามเกี่ยวกับข้อกำหนดนี้ โปรดติดต่อผู้ดูแล Virtual RUN",
    en: "For questions about these terms, please contact the Virtual RUN administrator.",
  },
  "data-deletion": {
    th: "ติดต่อผู้ดูแล Virtual RUN โดยใช้หัวข้อ “คำขอลบข้อมูล Virtual RUN”",
    en: "Contact the Virtual RUN administrator with the subject “Virtual RUN Data Deletion Request.”",
  },
} as const;

export function isLegalDocumentKey(value: unknown): value is LegalDocumentKey {
  return typeof value === "string" && LEGAL_DOCUMENT_KEYS.includes(value as LegalDocumentKey);
}

export function normalizeLegalText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function escapeLegalPlainText(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function normalizeLegalRichText(value: unknown) {
  const input = normalizeLegalText(value);
  if (!input) return "";

  const hasHtmlElement = /<\/?[a-z][^>]*>/i.test(input);
  if (hasHtmlElement) return sanitizeContentHtml(input);

  const html = input
    .split(/\r?\n{2,}/)
    .map((block) => `<p>${escapeLegalPlainText(block).replace(/\r?\n/g, "<br>")}</p>`)
    .join("");
  return sanitizeContentHtml(html);
}

function validateRequiredLegalField(value: string, maxLength: number, fieldLabel: string) {
  if (!value) return `กรุณากรอก${fieldLabel}ให้ครบทั้งภาษาไทยและภาษาอังกฤษ`;
  if (value.length > maxLength) {
    return `${fieldLabel}ต้องไม่เกิน ${maxLength.toLocaleString("en-US")} ตัวอักษรต่อภาษา`;
  }
  return null;
}

export function validateLegalHeaderTitle(value: string) {
  return validateRequiredLegalField(value, MAX_LEGAL_HEADER_TITLE_LENGTH, "ชื่อ Header title");
}

export function validateLegalHeaderSubtitle(value: string) {
  return validateRequiredLegalField(value, MAX_LEGAL_HEADER_SUBTITLE_LENGTH, "Sub title");
}

export function validateLegalText(value: string) {
  const safeHtml = normalizeLegalRichText(value);
  const plainText = sanitizeHtml(safeHtml, { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, " ")
    .trim();
  if (!plainText) return "กรุณากรอกเนื้อหาให้ครบทั้งภาษาไทยและภาษาอังกฤษ";
  if (safeHtml.length > MAX_LEGAL_TEXT_LENGTH) {
    return `เนื้อหาต้องไม่เกิน ${MAX_LEGAL_TEXT_LENGTH.toLocaleString("en-US")} ตัวอักษรต่อภาษา`;
  }
  return null;
}

export function validateLegalContactText(value: string) {
  if (!value) return "กรุณากรอกข้อความติดต่อผู้ดูแลให้ครบทั้งภาษาไทยและภาษาอังกฤษ";
  if (value.length > MAX_LEGAL_CONTACT_TEXT_LENGTH) {
    return `ข้อความติดต่อต้องไม่เกิน ${MAX_LEGAL_CONTACT_TEXT_LENGTH.toLocaleString("en-US")} ตัวอักษรต่อภาษา`;
  }
  return null;
}

export function getLocalizedLegalContactText(
  locale: Locale,
  thaiText: string,
  englishText: string,
) {
  return locale === "en" ? englishText : thaiText;
}

export function serializeLegalDocument(document: PublicLegalDocument, locale: Locale) {
  return document.sections
    .map((section) => {
      const title = section.title[locale];
      const paragraphs = section.paragraphs?.map((paragraph) => paragraph[locale]) ?? [];
      const bullets = section.bullets?.map((bullet) => `• ${bullet[locale]}`) ?? [];
      return [title, ...paragraphs, ...bullets].join("\n");
    })
    .join("\n\n");
}

export const DEFAULT_LEGAL_TEXTS = {
  privacy: {
    th: serializeLegalDocument(PRIVACY_NOTICE, "th"),
    en: serializeLegalDocument(PRIVACY_NOTICE, "en"),
  },
  terms: {
    th: serializeLegalDocument(TERMS_OF_SERVICE, "th"),
    en: serializeLegalDocument(TERMS_OF_SERVICE, "en"),
  },
  "data-deletion": {
    th: serializeLegalDocument(DATA_DELETION_INSTRUCTIONS, "th"),
    en: serializeLegalDocument(DATA_DELETION_INSTRUCTIONS, "en"),
  },
} as const;

export function getLocalizedLegalCopy(
  document: PublicLegalDocument,
  locale: Locale,
  thaiBody: string,
  englishBody: string,
  thaiTitle: string = document.title.th,
  englishTitle: string = document.title.en,
  thaiSubtitle: string = document.summary.th,
  englishSubtitle: string = document.summary.en,
) {
  return {
    title: locale === "en" ? englishTitle : thaiTitle,
    summary: locale === "en" ? englishSubtitle : thaiSubtitle,
    lastUpdated: LEGAL_LAST_UPDATED[locale],
    body: normalizeLegalRichText(locale === "en" ? englishBody : thaiBody),
  };
}
