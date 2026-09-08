import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  normalizePromptPayId,
  validateIntegrationSettingsInput,
} from "../lib/integration-configuration.ts";
import {
  decryptSettingSecret,
  encryptSettingSecret,
} from "../lib/settings-encryption.ts";

const existingSecrets = {
  stravaClientSecret: false,
  stravaWebhookVerifyToken: false,
  lineLoginChannelSecret: false,
  lineChannelAccessToken: false,
  turnstileSecretKey: false,
  promptpayId: false,
};

const validInput = {
  stravaSource: "backend",
  stravaClientId: "12345",
  stravaClientSecret: "strava-secret",
  clearStravaClientSecret: false,
  stravaWebhookVerifyToken: "verify-token",
  clearStravaWebhookVerifyToken: false,
  lineLoginSource: "backend",
  lineLoginChannelId: "line-channel",
  lineLoginChannelSecret: "line-secret",
  clearLineLoginChannelSecret: false,
  lineMessagingSource: "backend",
  lineChannelAccessToken: "line-access-token",
  clearLineChannelAccessToken: false,
  turnstileSource: "backend",
  turnstileSiteKey: "site-key",
  turnstileSecretKey: "turnstile-secret",
  clearTurnstileSecretKey: false,
  turnstileExpectedHostname: "vrrun.bu.ac.th",
  promptpaySource: "backend",
  promptpayId: "081-234-5678",
  clearPromptpayId: false,
  googleLoginVisible: true,
  facebookLoginVisible: true,
};

test("encrypts all backend integration secrets with authenticated encryption", () => {
  const key = "test-only-backend-encryption-key-over-32-characters";
  const encrypted = encryptSettingSecret("integration-secret", key);

  assert.notEqual(encrypted, "integration-secret");
  assert.equal(decryptSettingSecret(encrypted, key), "integration-secret");
  assert.throws(() => decryptSettingSecret(encrypted, `${key}-wrong`));
});

test("validates backend integration requirements and PromptPay identifiers", () => {
  assert.equal(
    validateIntegrationSettingsInput(validInput, existingSecrets),
    null,
  );
  assert.equal(normalizePromptPayId(validInput.promptpayId), "0812345678");
  assert.match(
    validateIntegrationSettingsInput(
      { ...validInput, stravaClientSecret: "" },
      existingSecrets,
    ),
    /Strava Client Secret/,
  );
  assert.match(
    validateIntegrationSettingsInput(
      { ...validInput, promptpayId: "1234" },
      existingSecrets,
    ),
    /10, 13 หรือ 15/,
  );
});

test("integration settings migration is service-role only", async () => {
  const migration = await readFile(
    new URL(
      "../supabase/migrations/20260908013509_integration_settings.sql",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(migration, /enable row level security/i);
  assert.match(migration, /revoke all .* anon, authenticated, service_role/i);
  assert.match(migration, /grant select, insert, update .* service_role/i);
  assert.doesNotMatch(migration, /create policy/i);
  assert.match(migration, /_ciphertext/g);
});

test("runtime integrations read through the server-only settings module", async () => {
  const consumers = [
    "../lib/strava/api.ts",
    "../lib/line.ts",
    "../lib/turnstile.ts",
    "../lib/promptpay.ts",
  ];

  for (const relativePath of consumers) {
    const source = await readFile(new URL(relativePath, import.meta.url), "utf8");
    assert.match(source, /@\/lib\/integration-settings/, relativePath);
  }
});

test("social provider secrets are not accepted by the application backend form", async () => {
  const page = await readFile(
    new URL("../app/admin/integrations/page.tsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(page, /name="google_(?:client_)?secret"/i);
  assert.doesNotMatch(page, /name="facebook_(?:client_)?secret"/i);
  assert.match(page, /Supabase Auth/);
});
