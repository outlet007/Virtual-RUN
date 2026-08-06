import assert from "node:assert/strict";
import test from "node:test";
import { createUtf8BomCsv } from "../lib/csv.ts";

test("creates an Excel-compatible UTF-8 BOM CSV", () => {
  const csv = createUtf8BomCsv([
    ["ชื่อผู้สมัคร", "อีเมล", "หมายเหตุ"],
    ["สมชาย, ใจดี", "runner@example.com", 'ข้อความ "ทดสอบ"'],
  ]);

  assert.equal(csv.charCodeAt(0), 0xfeff);
  assert.match(csv, /ชื่อผู้สมัคร/);
  assert.match(csv, /"สมชาย, ใจดี"/);
  assert.match(csv, /"ข้อความ ""ทดสอบ"""/);
  assert.ok(csv.endsWith("\r\n"));
});

test("neutralizes spreadsheet formulas from user-controlled values", () => {
  const csv = createUtf8BomCsv([["=HYPERLINK(\"https://example.com\")"]]);
  assert.match(csv, /^\uFEFF"'=HYPERLINK/);
});
