import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  DEFAULT_LEGAL_TEXTS,
  getLocalizedLegalCopy,
  isLegalDocumentKey,
  LEGAL_DOCUMENT_CONFIG,
  normalizeLegalText,
  validateLegalText,
} from "../lib/legal-settings.ts";

test("legal settings define one editable destination for each public document", () => {
  assert.deepEqual(Object.keys(LEGAL_DOCUMENT_CONFIG), ["privacy", "terms", "data-deletion"]);
  assert.equal(new Set(Object.values(LEGAL_DOCUMENT_CONFIG).map((item) => item.thaiField)).size, 3);
  assert.equal(new Set(Object.values(LEGAL_DOCUMENT_CONFIG).map((item) => item.englishField)).size, 3);
  assert.equal(isLegalDocumentKey("privacy"), true);
  assert.equal(isLegalDocumentKey("unknown"), false);
});

test("localized public copy selects exactly the current language", () => {
  const document = LEGAL_DOCUMENT_CONFIG.privacy.document;
  const thai = getLocalizedLegalCopy(document, "th", "ข้อความไทยเท่านั้น", "English only");
  const english = getLocalizedLegalCopy(document, "en", "ข้อความไทยเท่านั้น", "English only");

  assert.equal(thai.body, "<p>ข้อความไทยเท่านั้น</p>");
  assert.equal(thai.title, document.title.th);
  assert.equal(english.body, "<p>English only</p>");
  assert.equal(english.title, document.title.en);
  assert.notEqual(thai.body, english.body);
});

test("legal text validation requires useful bounded content", () => {
  assert.equal(normalizeLegalText("  content  "), "content");
  assert.match(validateLegalText(""), /กรุณากรอก/);
  assert.match(validateLegalText("x".repeat(20001)), /20,000/);
  assert.equal(validateLegalText("valid content"), null);
  assert.match(DEFAULT_LEGAL_TEXTS["data-deletion"].en, /Facebook/);
});

test("migration keeps legal copy public-readable and browser writes service-role only", async () => {
  const sql = await readFile(
    "supabase/migrations/20260911053000_add_legal_page_settings.sql",
    "utf8",
  );
  assert.match(sql, /terms_of_service_text_en/);
  assert.match(sql, /data_deletion_text_en/);
  assert.doesNotMatch(sql, /create\s+policy/i);
  assert.doesNotMatch(sql, /grant\s+(insert|update|delete)/i);
});

test("admin legal editor is tabbed and protected by super-admin authorization", async () => {
  const [page, layout, action, publicPage] = await Promise.all([
    readFile("app/admin/legal/page.tsx", "utf8"),
    readFile("app/admin/legal/layout.tsx", "utf8"),
    readFile("lib/actions/legal-settings.ts", "utf8"),
    readFile("components/public-legal-page.tsx", "utf8"),
  ]);
  assert.match(page, /<Tabs/);
  assert.match(page, /text_th/);
  assert.match(page, /text_en/);
  assert.match(layout, /requireSuperAdmin/);
  assert.match(action, /requireSuperAdmin/);
  assert.match(publicPage, /getLocalizedLegalCopy/);
  assert.doesNotMatch(publicPage, /document\.title\.(th|en)/);
});
