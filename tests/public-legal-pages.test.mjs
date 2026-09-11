import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  DATA_DELETION_INSTRUCTIONS,
  normalizePrivacyContactEmail,
  PUBLIC_LEGAL_DOCUMENTS,
  PUBLIC_LEGAL_PATHS,
} from "../lib/public-legal-pages.ts";

test("public legal routes use stable, unique paths", () => {
  assert.deepEqual(Object.values(PUBLIC_LEGAL_PATHS), [
    "/privacy",
    "/terms",
    "/data-deletion",
  ]);
  assert.equal(new Set(Object.values(PUBLIC_LEGAL_PATHS)).size, 3);
});

test("every legal document includes useful Thai and English content", () => {
  assert.equal(PUBLIC_LEGAL_DOCUMENTS.length, 3);

  for (const document of PUBLIC_LEGAL_DOCUMENTS) {
    assert.ok(document.title.th.length > 5);
    assert.ok(document.title.en.length > 5);
    assert.ok(document.summary.th.length > 20);
    assert.ok(document.summary.en.length > 20);
    assert.ok(document.sections.length >= 3);

    for (const section of document.sections) {
      assert.ok(section.title.th.length > 3);
      assert.ok(section.title.en.length > 3);
      const text = JSON.stringify(section);
      assert.doesNotMatch(text, /YOUR_|REQUIRED/);
      assert.doesNotMatch(text, /example\.com|https:\/\/www\.facebook\.com\/$/i);
    }
  }
});

test("data-deletion instructions are actionable and reject secret credentials", () => {
  const content = JSON.stringify(DATA_DELETION_INSTRUCTIONS);
  assert.match(content, /Facebook/);
  assert.match(content, /ลบ/);
  assert.match(content, /delete/i);
  assert.match(content, /รหัสผ่าน/);
  assert.match(content, /App Secret/);
  assert.match(content, /access token/i);
  assert.ok(DATA_DELETION_INSTRUCTIONS.sections.some((section) => section.showContact));
});

test("privacy contact email is normalized without accepting malformed values", () => {
  assert.equal(normalizePrivacyContactEmail(" privacy@example.org "), "privacy@example.org");
  assert.equal(normalizePrivacyContactEmail(""), null);
  assert.equal(normalizePrivacyContactEmail("not-an-email"), null);
  assert.equal(normalizePrivacyContactEmail(undefined), null);
});

test("route files and site footer expose all public legal destinations", async () => {
  const routes = [
    ["app/privacy/page.tsx", "PRIVACY_NOTICE"],
    ["app/terms/page.tsx", "TERMS_OF_SERVICE"],
    ["app/data-deletion/page.tsx", "DATA_DELETION_INSTRUCTIONS"],
  ];

  for (const [path, expectedDocument] of routes) {
    const source = await readFile(path, "utf8");
    assert.match(source, new RegExp(expectedDocument));
    assert.match(source, /robots: \{ index: true, follow: true \}/);
  }

  const layout = await readFile("app/layout.tsx", "utf8");
  for (const path of Object.values(PUBLIC_LEGAL_PATHS)) {
    assert.ok(layout.includes(`href="${path}"`), `footer is missing ${path}`);
  }
});
