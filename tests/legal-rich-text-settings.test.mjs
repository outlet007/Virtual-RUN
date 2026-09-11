import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  DEFAULT_LEGAL_HEADERS,
  getLocalizedLegalCopy,
  LEGAL_DOCUMENT_CONFIG,
  normalizeLegalRichText,
  validateLegalHeaderSubtitle,
  validateLegalHeaderTitle,
  validateLegalText,
} from "../lib/legal-settings.ts";

test("every legal tab owns independent bilingual header and subtitle fields", () => {
  const configs = Object.values(LEGAL_DOCUMENT_CONFIG);

  for (const field of [
    "titleThaiField",
    "titleEnglishField",
    "subtitleThaiField",
    "subtitleEnglishField",
  ]) {
    assert.equal(new Set(configs.map((config) => config[field])).size, 3);
  }

  assert.equal(DEFAULT_LEGAL_HEADERS.privacy.title.en, "Privacy Notice");
  assert.equal(DEFAULT_LEGAL_HEADERS.terms.title.en, "Terms of Service");
  assert.equal(
    DEFAULT_LEGAL_HEADERS["data-deletion"].title.en,
    "User Data Deletion Instructions",
  );
});

test("localized legal copy selects the saved header, subtitle, and rich text language", () => {
  const document = LEGAL_DOCUMENT_CONFIG.privacy.document;
  const thai = getLocalizedLegalCopy(
    document,
    "th",
    "<h2>Thai body</h2>",
    "<h2>English body</h2>",
    "Thai title",
    "English title",
    "Thai subtitle",
    "English subtitle",
  );
  const english = getLocalizedLegalCopy(
    document,
    "en",
    "<h2>Thai body</h2>",
    "<h2>English body</h2>",
    "Thai title",
    "English title",
    "Thai subtitle",
    "English subtitle",
  );

  assert.deepEqual(
    { title: thai.title, summary: thai.summary, body: thai.body },
    { title: "Thai title", summary: "Thai subtitle", body: "<h2>Thai body</h2>" },
  );
  assert.deepEqual(
    { title: english.title, summary: english.summary, body: english.body },
    {
      title: "English title",
      summary: "English subtitle",
      body: "<h2>English body</h2>",
    },
  );
});

test("legal rich text converts legacy plain text and sanitizes stored HTML", () => {
  const legacy = normalizeLegalRichText("First line\ncontinued\n\nSecond paragraph");
  assert.match(legacy, /<p>First line<br \/>continued<\/p>/);
  assert.match(legacy, /<p>Second paragraph<\/p>/);

  const unsafe = normalizeLegalRichText(
    '<script>alert("x")</script><h2>Safe heading</h2><iframe src="https://evil.example/embed"></iframe>',
  );
  assert.doesNotMatch(unsafe, /script|evil\.example/i);
  assert.match(unsafe, /<h2>Safe heading<\/h2>/);
  assert.equal(validateLegalText(unsafe), null);
});

test("legal header and subtitle validation matches database limits", () => {
  assert.match(validateLegalHeaderTitle(""), /Header title/);
  assert.match(validateLegalHeaderTitle("x".repeat(241)), /240/);
  assert.equal(validateLegalHeaderTitle("Privacy Notice"), null);
  assert.match(validateLegalHeaderSubtitle("x".repeat(501)), /500/);
  assert.equal(validateLegalHeaderSubtitle("Short summary"), null);
});

test("admin and public legal pages use the article rich text flow safely", async () => {
  const [page, action, publicPage, privacy, terms, deletion, migration] = await Promise.all([
    readFile("app/admin/legal/page.tsx", "utf8"),
    readFile("lib/actions/legal-settings.ts", "utf8"),
    readFile("components/public-legal-page.tsx", "utf8"),
    readFile("app/privacy/page.tsx", "utf8"),
    readFile("app/terms/page.tsx", "utf8"),
    readFile("app/data-deletion/page.tsx", "utf8"),
    readFile("supabase/migrations/20260911125633_add_legal_header_fields.sql", "utf8"),
  ]);

  assert.equal(page.match(/<RichTextEditor/g)?.length, 2);
  assert.equal(page.match(/uploadTarget="content"/g)?.length, 2);
  for (const name of ["title_th", "title_en", "subtitle_th", "subtitle_en"]) {
    assert.ok(page.includes(`name="${name}"`));
  }

  assert.match(action, /normalizeLegalRichText\(formData\.get\("text_th"\)\)/);
  assert.match(action, /\[config\.titleThaiField\]: titleTh/);
  assert.match(action, /\[config\.subtitleEnglishField\]: subtitleEn/);
  assert.match(publicPage, /dangerouslySetInnerHTML=\{\{ __html: copy\.body \}\}/);

  assert.match(privacy, /settings\.privacy_header_title_en/);
  assert.match(terms, /settings\.terms_header_subtitle_en/);
  assert.match(deletion, /settings\.data_deletion_header_title_en/);

  for (const prefix of ["privacy", "terms", "data_deletion"]) {
    assert.match(migration, new RegExp(`add column ${prefix}_header_title text`, "i"));
    assert.match(migration, new RegExp(`add column ${prefix}_header_title_en text`, "i"));
    assert.match(migration, new RegExp(`add column ${prefix}_header_subtitle text`, "i"));
    assert.match(migration, new RegExp(`add column ${prefix}_header_subtitle_en text`, "i"));
  }
  assert.doesNotMatch(migration, /create\s+policy/i);
  assert.doesNotMatch(migration, /grant\s+(insert|update|delete)/i);
});
