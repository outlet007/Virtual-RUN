import assert from "node:assert/strict";
import test from "node:test";
import {
  createContentSlug,
  estimateReadingMinutes,
  normalizeContentLink,
  sanitizeContentHtml,
} from "../lib/content.ts";
import {
  DEFAULT_CATEGORY_BADGE_BACKGROUND_COLOR,
  normalizeCategoryBadgeColor,
} from "../lib/category-badge.ts";

test("creates stable URL-safe content slugs", () => {
  assert.equal(createContentSlug("Hello, Virtual RUN!"), "hello-virtual-run");
  assert.equal(createContentSlug("", "News 2026"), "news-2026");
});

test("accepts internal and http links while rejecting unsafe protocols", () => {
  assert.equal(normalizeContentLink("/events/abc"), "/events/abc");
  assert.equal(normalizeContentLink("https://example.com/news"), "https://example.com/news");
  assert.equal(normalizeContentLink("javascript:alert(1)"), null);
});

test("sanitizes article HTML and secures links", () => {
  const html = sanitizeContentHtml(
    '<p>Safe</p><script>alert(1)</script><a href="https://example.com">Read</a>',
  );
  assert.doesNotMatch(html, /script/i);
  assert.match(html, /rel="noopener noreferrer"/);
});

test("estimates at least one reading minute", () => {
  assert.equal(estimateReadingMinutes("<p>สั้น</p>"), 1);
  assert.equal(estimateReadingMinutes(`<p>${"ก".repeat(701)}</p>`), 2);
});

test("normalizes valid category badge colors and rejects unsafe values", () => {
  assert.equal(normalizeCategoryBadgeColor("#a1b2c3"), "#A1B2C3");
  assert.equal(normalizeCategoryBadgeColor(" red "), null);
  assert.equal(DEFAULT_CATEGORY_BADGE_BACKGROUND_COLOR, "#FEC81D");
});
