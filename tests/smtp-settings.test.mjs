import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import {
  decryptSmtpPassword,
  encryptSmtpPassword,
  isValidSmtpEmail,
  validateSmtpInput,
} from "../lib/smtp-configuration.ts";

test("encrypts SMTP passwords with authenticated encryption", () => {
  const key = "test-only-encryption-key-that-is-at-least-32-chars";
  const encrypted = encryptSmtpPassword("mail-secret", key);

  assert.notEqual(encrypted, "mail-secret");
  assert.equal(decryptSmtpPassword(encrypted, key), "mail-secret");
  assert.throws(() => decryptSmtpPassword(encrypted, `${key}-wrong`));
});

test("validates SMTP connection and sender fields", () => {
  const valid = {
    enabled: true,
    host: "smtp.example.com",
    port: 587,
    secure: false,
    username: "mailer@example.com",
    fromName: "Virtual RUN",
    fromEmail: "noreply@example.com",
  };

  assert.equal(validateSmtpInput(valid), null);
  assert.equal(isValidSmtpEmail(valid.fromEmail), true);
  assert.match(validateSmtpInput({ ...valid, port: 70000 }), /port/i);
  assert.equal(isValidSmtpEmail("not-an-email"), false);
});

test("SMTP migration blocks browser roles and grants only the service role", async () => {
  const migration = await readFile(
    new URL("../supabase/migrations/20260907075311_smtp_settings.sql", import.meta.url),
    "utf8",
  );

  assert.match(migration, /enable row level security/i);
  assert.match(migration, /revoke all .* anon, authenticated, service_role/i);
  assert.match(migration, /grant select, insert, update .* service_role/i);
  assert.doesNotMatch(migration, /create policy/i);
});
