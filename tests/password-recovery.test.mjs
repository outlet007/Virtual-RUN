import assert from "node:assert/strict";
import test from "node:test";
import {
  getNewPasswordError,
  isValidRecoveryEmail,
  normalizeRecoveryEmail,
} from "../lib/password-recovery.ts";

test("normalizes and validates recovery email without account lookup", () => {
  const email = normalizeRecoveryEmail("  Runner@Example.COM ");
  assert.equal(email, "runner@example.com");
  assert.equal(isValidRecoveryEmail(email), true);
  assert.equal(isValidRecoveryEmail("not-an-email"), false);
});

test("validates new password length and confirmation", () => {
  assert.equal(getNewPasswordError("12345", "12345"), "password_too_short");
  assert.equal(getNewPasswordError("runner123", "runner456"), "password_mismatch");
  assert.equal(getNewPasswordError("runner123", "runner123"), null);
});
