import "server-only";

import {
  decryptBackendSecret,
  encryptBackendSecret,
  isBackendSettingsEncryptionReady,
} from "@/lib/backend-settings-secrets";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SmtpInput } from "@/lib/smtp-configuration";

type StoredSmtpSettings = {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password_ciphertext: string | null;
  from_name: string;
  from_email: string;
};

export type ActiveSmtpConfiguration = {
  source: "backend" | "environment";
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  from: string | { name: string; address: string };
};

export type SmtpSettingsSummary = Omit<StoredSmtpSettings, "password_ciphertext"> & {
  available: boolean;
  has_password: boolean;
  encryption_ready: boolean;
};

const EMPTY_SUMMARY: SmtpSettingsSummary = {
  available: false,
  enabled: false,
  host: "",
  port: 587,
  secure: false,
  username: "",
  from_name: "Virtual RUN",
  from_email: "",
  has_password: false,
  encryption_ready: false,
};

async function readStoredSettings() {
  const db = createAdminClient();
  const { data, error } = await db
    .from("smtp_settings")
    .select("enabled, host, port, secure, username, password_ciphertext, from_name, from_email")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    console.error("Unable to read SMTP settings", { code: error.code });
    return null;
  }
  return data as StoredSmtpSettings | null;
}

export async function getSmtpSettingsSummary(): Promise<SmtpSettingsSummary> {
  const settings = await readStoredSettings();
  if (!settings) {
    return {
      ...EMPTY_SUMMARY,
      encryption_ready: isBackendSettingsEncryptionReady(),
    };
  }

  const { password_ciphertext, ...safeSettings } = settings;
  return {
    ...safeSettings,
    available: true,
    has_password: Boolean(password_ciphertext),
    encryption_ready: isBackendSettingsEncryptionReady(),
  };
}

export async function saveSmtpSettings(
  input: SmtpInput & { password: string; clearPassword: boolean; updatedBy: string },
) {
  const db = createAdminClient();
  const existing = await readStoredSettings();
  let passwordCiphertext = input.clearPassword ? null : existing?.password_ciphertext ?? null;

  if (input.password) {
    passwordCiphertext = encryptBackendSecret(input.password);
  }

  const { error } = await db.from("smtp_settings").upsert({
    id: 1,
    enabled: input.enabled,
    host: input.host,
    port: input.port,
    secure: input.secure,
    username: input.username,
    password_ciphertext: passwordCiphertext,
    from_name: input.fromName,
    from_email: input.fromEmail,
    updated_at: new Date().toISOString(),
    updated_by: input.updatedBy,
  });
  if (error) throw new Error("Unable to save SMTP settings");
}

export async function getActiveSmtpConfiguration(): Promise<ActiveSmtpConfiguration> {
  const settings = await readStoredSettings();
  if (settings?.enabled) {
    const password = settings.password_ciphertext
      ? decryptBackendSecret(settings.password_ciphertext)
      : "";
    return {
      source: "backend",
      host: settings.host,
      port: settings.port,
      secure: settings.secure,
      username: settings.username,
      password,
      from: { name: settings.from_name, address: settings.from_email },
    };
  }

  const port = Number(process.env.SMTP_PORT ?? 587);
  return {
    source: "environment",
    host: process.env.SMTP_HOST ?? "",
    port: Number.isInteger(port) ? port : 587,
    secure: process.env.SMTP_SECURE === "true" || port === 465,
    username: process.env.SMTP_USER ?? "",
    password: process.env.SMTP_PASS ?? "",
    from: process.env.SMTP_FROM ?? "",
  };
}
