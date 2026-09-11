import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  DEFAULT_LEGAL_CONTACT_TEXTS,
  getLocalizedLegalContactText,
  LEGAL_DOCUMENT_CONFIG,
  validateLegalContactText,
} from "../lib/legal-settings.ts";

const ORIGINAL_CONTACT_TEXTS = {
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
};

test("each legal tab has independent contact fields with the original copy", () => {
  assert.equal(getLocalizedLegalContactText("th", "ข้อความภาษาไทย", "English text"), "ข้อความภาษาไทย");
  assert.equal(getLocalizedLegalContactText("en", "ข้อความภาษาไทย", "English text"), "English text");

  const configs = Object.values(LEGAL_DOCUMENT_CONFIG);
  assert.equal(new Set(configs.map((config) => config.contactThaiField)).size, 3);
  assert.equal(new Set(configs.map((config) => config.contactEnglishField)).size, 3);
  assert.deepEqual(DEFAULT_LEGAL_CONTACT_TEXTS, ORIGINAL_CONTACT_TEXTS);
});

test("legal contact text requires useful bounded content", () => {
  assert.match(validateLegalContactText(""), /กรุณากรอก/);
  assert.match(validateLegalContactText("x".repeat(2001)), /2,000/);
  assert.equal(validateLegalContactText("Official contact channel"), null);
});

test("every admin legal tab exposes bilingual contact fields to super admins", async () => {
  const [page, action, publicPage, dataDeletionPage] = await Promise.all([
    readFile("app/admin/legal/page.tsx", "utf8"),
    readFile("lib/actions/legal-settings.ts", "utf8"),
    readFile("components/public-legal-page.tsx", "utf8"),
    readFile("app/data-deletion/page.tsx", "utf8"),
  ]);

  assert.match(page, /contact_text_th/);
  assert.match(page, /contact_text_en/);
  assert.match(page, /ข้อความติดต่อผู้ดูแล/);
  assert.doesNotMatch(page, /document === "data-deletion" &&/);
  assert.match(page, /settings\[config\.contactThaiField\]/);
  assert.match(page, /settings\[config\.contactEnglishField\]/);
  assert.match(action, /requireSuperAdmin/);
  assert.match(action, /\[config\.contactThaiField\]:\s*contactTextTh/);
  assert.match(action, /\[config\.contactEnglishField\]:\s*contactTextEn/);
  assert.doesNotMatch(action, /legal_contact_text:\s*contactTextTh/);
  assert.doesNotMatch(action, /if \(document === "data-deletion"\)/);
  assert.match(publicPage, /getLocalizedLegalContactText/);
  assert.match(dataDeletionPage, /settings\.data_deletion_contact_text_en/);
});

test("switching legal tabs remounts uncontrolled editors instead of reusing stale values", async () => {
  const tabs = await readFile("components/ui/tabs.tsx", "utf8");

  assert.match(tabs, /key=\{tabs\[active\]\.id\}/);
});

test("migrations restore original per-page contact copy without browser write permissions", async () => {
  const [schemaSql, restoreSql, normalizeSql] = await Promise.all([
    readFile("supabase/migrations/20260911092442_add_per_document_legal_contact_text.sql", "utf8"),
    readFile("supabase/migrations/20260911093719_restore_original_per_document_contact_text.sql", "utf8"),
    readFile("supabase/migrations/20260911094107_normalize_restored_legal_contact_text.sql", "utf8"),
  ]);

  for (const prefix of ["privacy", "terms", "data_deletion"]) {
    assert.match(schemaSql, new RegExp(`add column ${prefix}_contact_text text not null`, "i"));
    assert.match(schemaSql, new RegExp(`add column ${prefix}_contact_text_en text not null`, "i"));
    assert.match(restoreSql, new RegExp(`${prefix}_contact_text\\s*=`, "i"));
    assert.match(restoreSql, new RegExp(`${prefix}_contact_text_en\\s*=`, "i"));
  }
  assert.match(restoreSql, /คุณสามารถติดต่อผู้ดูแลระบบเพื่อขอเข้าถึง แก้ไข หรือลบข้อมูลส่วนบุคคลของคุณได้/);
  assert.match(restoreSql, /หากมีคำถามเกี่ยวกับข้อกำหนดนี้ โปรดติดต่อผู้ดูแล Virtual RUN/);
  assert.match(restoreSql, /คำขอลบข้อมูล Virtual RUN/);
  assert.match(normalizeSql, /privacy_contact_text = 'คุณสามารถติดต่อผู้ดูแลระบบเพื่อขอเข้าถึง แก้ไข หรือลบข้อมูลส่วนบุคคลของคุณได้'/);
  assert.match(normalizeSql, /terms_contact_text = 'หากมีคำถามเกี่ยวกับข้อกำหนดนี้ โปรดติดต่อผู้ดูแล Virtual RUN'/);
  assert.match(normalizeSql, /data_deletion_contact_text = 'ติดต่อผู้ดูแล Virtual RUN โดยใช้หัวข้อ “คำขอลบข้อมูล Virtual RUN”'/);
  assert.doesNotMatch(restoreSql, /create\s+policy/i);
  assert.doesNotMatch(restoreSql, /grant\s+(insert|update|delete)/i);
  assert.doesNotMatch(normalizeSql, /create\s+policy/i);
  assert.doesNotMatch(normalizeSql, /grant\s+(insert|update|delete)/i);
});
