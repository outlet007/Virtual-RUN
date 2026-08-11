import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_LOCALE,
  formatLocalizedDate,
  isLocale,
  pickLocalized,
  titleCaseEnglish,
  tx,
} from "../lib/i18n/shared.ts";

test("locale validation only accepts supported locales", () => {
  assert.equal(DEFAULT_LOCALE, "th");
  assert.equal(isLocale("th"), true);
  assert.equal(isLocale("en"), true);
  assert.equal(isLocale("ja"), false);
  assert.equal(isLocale(null), false);
});

test("localized content uses English when present", () => {
  assert.equal(pickLocalized("en", "งานวิ่ง", "Running event"), "Running event");
  assert.equal(pickLocalized("th", "งานวิ่ง", "Running event"), "งานวิ่ง");
});

test("English locale falls back to Thai for empty translations", () => {
  assert.equal(pickLocalized("en", "งานวิ่ง", null), "งานวิ่ง");
  assert.equal(pickLocalized("en", "งานวิ่ง", "   "), "งานวิ่ง");
});

test("static translation helper selects the active locale", () => {
  assert.equal(tx("th", "บันทึก", "Save"), "บันทึก");
  assert.equal(tx("en", "บันทึก", "Save"), "Save");
});

test("English UI uses title case while keeping conjunctions lowercase", () => {
  assert.equal(titleCaseEnglish("articles and insights"), "Articles and Insights");
  assert.equal(titleCaseEnglish("sign in to register"), "Sign in to Register");
  assert.equal(titleCaseEnglish("OCR and SEO settings"), "OCR and SEO Settings");
  assert.equal(titleCaseEnglish("PromptPay payment"), "PromptPay Payment");
  assert.equal(titleCaseEnglish("in stock"), "In Stock");
});

test("article dates follow the selected locale", () => {
  const date = "2026-08-11T00:00:00.000Z";
  assert.match(formatLocalizedDate("en", date), /Aug/);
  assert.match(formatLocalizedDate("th", date), /2569/);
});
