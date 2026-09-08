import "server-only";

import { decryptSettingSecret, encryptSettingSecret } from "@/lib/settings-encryption";

function getEncryptionKeys() {
  return [
    process.env.BACKEND_SETTINGS_ENCRYPTION_KEY,
    process.env.SMTP_SETTINGS_ENCRYPTION_KEY,
  ].filter((value): value is string => Boolean(value && value.length >= 32));
}

export function isBackendSettingsEncryptionReady() {
  return getEncryptionKeys().length > 0;
}

export function encryptBackendSecret(value: string) {
  const key = getEncryptionKeys()[0];
  if (!key) {
    throw new Error("BACKEND_SETTINGS_ENCRYPTION_KEY must contain at least 32 characters");
  }
  return encryptSettingSecret(value, key);
}

export function decryptBackendSecret(payload: string) {
  const keys = getEncryptionKeys();
  if (keys.length === 0) {
    throw new Error("Backend settings encryption key is not configured");
  }

  for (const key of keys) {
    try {
      return decryptSettingSecret(payload, key);
    } catch {
      // Try the legacy SMTP key so existing encrypted SMTP settings keep working.
    }
  }
  throw new Error("Unable to decrypt backend setting");
}
