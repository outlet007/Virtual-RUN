import assert from "node:assert/strict";
import test from "node:test";
import {
  hasCookieConsentText,
  sanitizeCookieConsentHtml,
} from "../lib/cookie-consent-html.ts";

test("keeps supported Cookie Consent formatting", () => {
  const result = sanitizeCookieConsentHtml(
    '<strong>สำคัญ</strong><br><a href="https://example.com" target="_blank">อ่านต่อ</a>',
  );

  assert.match(result, /<strong>สำคัญ<\/strong>/);
  assert.match(result, /<br\s*\/>/);
  assert.match(result, /href="https:\/\/example\.com"/);
  assert.match(result, /rel="noopener noreferrer"/);
});

test("removes scripts, event handlers, and unsafe URLs", () => {
  const result = sanitizeCookieConsentHtml(
    '<script>alert(1)</script><a href="javascript:alert(1)" onclick="alert(2)">ข้อความ</a>',
  );

  assert.doesNotMatch(result, /<script|javascript:|onclick/i);
  assert.equal(result, '<a>ข้อความ</a>');
});

test("requires visible message text", () => {
  assert.equal(hasCookieConsentText("<p><br></p>"), false);
  assert.equal(hasCookieConsentText("<p>Cookie</p>"), true);
});
