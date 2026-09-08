import "server-only";

import {
  decryptBackendSecret,
  encryptBackendSecret,
  isBackendSettingsEncryptionReady,
} from "@/lib/backend-settings-secrets";
import {
  normalizePromptPayId,
  validateIntegrationSettingsInput,
  type IntegrationSettingsInput,
  type IntegrationSource,
} from "@/lib/integration-configuration";
import { createAdminClient } from "@/lib/supabase/admin";

type StoredIntegrationSettings = {
  strava_source: IntegrationSource;
  strava_client_id: string;
  strava_client_secret_ciphertext: string | null;
  strava_webhook_verify_token_ciphertext: string | null;
  line_login_source: IntegrationSource;
  line_login_channel_id: string;
  line_login_channel_secret_ciphertext: string | null;
  line_messaging_source: IntegrationSource;
  line_channel_access_token_ciphertext: string | null;
  turnstile_source: IntegrationSource;
  turnstile_site_key: string;
  turnstile_secret_key_ciphertext: string | null;
  turnstile_expected_hostname: string;
  promptpay_source: IntegrationSource;
  promptpay_id_ciphertext: string | null;
  google_login_visible: boolean;
  facebook_login_visible: boolean;
};

const SETTINGS_COLUMNS =
  "strava_source, strava_client_id, strava_client_secret_ciphertext, strava_webhook_verify_token_ciphertext, line_login_source, line_login_channel_id, line_login_channel_secret_ciphertext, line_messaging_source, line_channel_access_token_ciphertext, turnstile_source, turnstile_site_key, turnstile_secret_key_ciphertext, turnstile_expected_hostname, promptpay_source, promptpay_id_ciphertext, google_login_visible, facebook_login_visible";

async function readStoredSettings() {
  const db = createAdminClient();
  const { data, error } = await db
    .from("integration_settings")
    .select(SETTINGS_COLUMNS)
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    console.error("Unable to read integration settings", { code: error.code });
    return null;
  }
  return data as StoredIntegrationSettings | null;
}

function decryptSecret(ciphertext: string | null) {
  if (!ciphertext) return "";
  try {
    return decryptBackendSecret(ciphertext);
  } catch {
    console.error("Unable to decrypt an integration setting");
    return "";
  }
}

function chooseSecret(
  existing: string | null | undefined,
  value: string,
  clear: boolean,
) {
  if (clear) return null;
  if (value) return encryptBackendSecret(value);
  return existing ?? null;
}

export type IntegrationSettingsSummary = {
  available: boolean;
  encryption_ready: boolean;
  strava_source: IntegrationSource;
  strava_client_id: string;
  has_strava_client_secret: boolean;
  has_strava_webhook_verify_token: boolean;
  line_login_source: IntegrationSource;
  line_login_channel_id: string;
  has_line_login_channel_secret: boolean;
  line_messaging_source: IntegrationSource;
  has_line_channel_access_token: boolean;
  turnstile_source: IntegrationSource;
  turnstile_site_key: string;
  has_turnstile_secret_key: boolean;
  turnstile_expected_hostname: string;
  promptpay_source: IntegrationSource;
  has_promptpay_id: boolean;
  google_login_visible: boolean;
  facebook_login_visible: boolean;
  environment_configured: {
    strava: boolean;
    line_login: boolean;
    line_messaging: boolean;
    turnstile: boolean;
    promptpay: boolean;
  };
};

export async function getIntegrationSettingsSummary(): Promise<IntegrationSettingsSummary> {
  const settings = await readStoredSettings();
  return {
    available: Boolean(settings),
    encryption_ready: isBackendSettingsEncryptionReady(),
    strava_source: settings?.strava_source ?? "environment",
    strava_client_id: settings?.strava_client_id ?? "",
    has_strava_client_secret: Boolean(settings?.strava_client_secret_ciphertext),
    has_strava_webhook_verify_token: Boolean(
      settings?.strava_webhook_verify_token_ciphertext,
    ),
    line_login_source: settings?.line_login_source ?? "environment",
    line_login_channel_id: settings?.line_login_channel_id ?? "",
    has_line_login_channel_secret: Boolean(
      settings?.line_login_channel_secret_ciphertext,
    ),
    line_messaging_source: settings?.line_messaging_source ?? "environment",
    has_line_channel_access_token: Boolean(
      settings?.line_channel_access_token_ciphertext,
    ),
    turnstile_source: settings?.turnstile_source ?? "environment",
    turnstile_site_key: settings?.turnstile_site_key ?? "",
    has_turnstile_secret_key: Boolean(settings?.turnstile_secret_key_ciphertext),
    turnstile_expected_hostname: settings?.turnstile_expected_hostname ?? "",
    promptpay_source: settings?.promptpay_source ?? "environment",
    has_promptpay_id: Boolean(settings?.promptpay_id_ciphertext),
    google_login_visible: settings?.google_login_visible ?? true,
    facebook_login_visible: settings?.facebook_login_visible ?? true,
    environment_configured: {
      strava: Boolean(
        process.env.STRAVA_CLIENT_ID &&
          process.env.STRAVA_CLIENT_SECRET &&
          process.env.STRAVA_WEBHOOK_VERIFY_TOKEN,
      ),
      line_login: Boolean(
        process.env.LINE_LOGIN_CHANNEL_ID && process.env.LINE_LOGIN_CHANNEL_SECRET,
      ),
      line_messaging: Boolean(process.env.LINE_CHANNEL_ACCESS_TOKEN),
      turnstile: Boolean(
        process.env.TURNSTILE_SITE_KEY && process.env.TURNSTILE_SECRET_KEY,
      ),
      promptpay: Boolean(process.env.PROMPTPAY_ID),
    },
  };
}

export async function saveIntegrationSettings(
  input: IntegrationSettingsInput & { updatedBy: string },
) {
  const existing = await readStoredSettings();
  const validationError = validateIntegrationSettingsInput(input, {
    stravaClientSecret: Boolean(existing?.strava_client_secret_ciphertext),
    stravaWebhookVerifyToken: Boolean(
      existing?.strava_webhook_verify_token_ciphertext,
    ),
    lineLoginChannelSecret: Boolean(
      existing?.line_login_channel_secret_ciphertext,
    ),
    lineChannelAccessToken: Boolean(
      existing?.line_channel_access_token_ciphertext,
    ),
    turnstileSecretKey: Boolean(existing?.turnstile_secret_key_ciphertext),
    promptpayId: Boolean(existing?.promptpay_id_ciphertext),
  });
  if (validationError) throw new Error(validationError);

  const hasNewSecret = Boolean(
    input.stravaClientSecret ||
      input.stravaWebhookVerifyToken ||
      input.lineLoginChannelSecret ||
      input.lineChannelAccessToken ||
      input.turnstileSecretKey ||
      input.promptpayId,
  );
  if (hasNewSecret && !isBackendSettingsEncryptionReady()) {
    throw new Error(
      "ต้องตั้งค่า BACKEND_SETTINGS_ENCRYPTION_KEY อย่างน้อย 32 ตัวอักษรก่อนบันทึก secret",
    );
  }

  const db = createAdminClient();
  const { error } = await db.from("integration_settings").upsert({
    id: 1,
    strava_source: input.stravaSource,
    strava_client_id: input.stravaClientId,
    strava_client_secret_ciphertext: chooseSecret(
      existing?.strava_client_secret_ciphertext,
      input.stravaClientSecret,
      input.clearStravaClientSecret,
    ),
    strava_webhook_verify_token_ciphertext: chooseSecret(
      existing?.strava_webhook_verify_token_ciphertext,
      input.stravaWebhookVerifyToken,
      input.clearStravaWebhookVerifyToken,
    ),
    line_login_source: input.lineLoginSource,
    line_login_channel_id: input.lineLoginChannelId,
    line_login_channel_secret_ciphertext: chooseSecret(
      existing?.line_login_channel_secret_ciphertext,
      input.lineLoginChannelSecret,
      input.clearLineLoginChannelSecret,
    ),
    line_messaging_source: input.lineMessagingSource,
    line_channel_access_token_ciphertext: chooseSecret(
      existing?.line_channel_access_token_ciphertext,
      input.lineChannelAccessToken,
      input.clearLineChannelAccessToken,
    ),
    turnstile_source: input.turnstileSource,
    turnstile_site_key: input.turnstileSiteKey,
    turnstile_secret_key_ciphertext: chooseSecret(
      existing?.turnstile_secret_key_ciphertext,
      input.turnstileSecretKey,
      input.clearTurnstileSecretKey,
    ),
    turnstile_expected_hostname: input.turnstileExpectedHostname,
    promptpay_source: input.promptpaySource,
    promptpay_id_ciphertext: chooseSecret(
      existing?.promptpay_id_ciphertext,
      normalizePromptPayId(input.promptpayId),
      input.clearPromptpayId,
    ),
    google_login_visible: input.googleLoginVisible,
    facebook_login_visible: input.facebookLoginVisible,
    updated_at: new Date().toISOString(),
    updated_by: input.updatedBy,
  });
  if (error) throw new Error("Unable to save integration settings");
}

type RuntimeConfiguration = {
  source: IntegrationSource;
  enabled: boolean;
  configured: boolean;
};

export async function getStravaConfiguration() {
  const settings = await readStoredSettings();
  const source = settings?.strava_source ?? "environment";
  const clientId =
    source === "backend"
      ? settings?.strava_client_id ?? ""
      : process.env.STRAVA_CLIENT_ID ?? "";
  const clientSecret =
    source === "backend"
      ? decryptSecret(settings?.strava_client_secret_ciphertext ?? null)
      : process.env.STRAVA_CLIENT_SECRET ?? "";
  const webhookVerifyToken =
    source === "backend"
      ? decryptSecret(settings?.strava_webhook_verify_token_ciphertext ?? null)
      : process.env.STRAVA_WEBHOOK_VERIFY_TOKEN ?? "";
  return {
    source,
    enabled: source !== "disabled",
    configured: Boolean(clientId && clientSecret && webhookVerifyToken),
    clientId,
    clientSecret,
    webhookVerifyToken,
  } satisfies RuntimeConfiguration & {
    clientId: string;
    clientSecret: string;
    webhookVerifyToken: string;
  };
}

export async function getLineLoginConfiguration() {
  const settings = await readStoredSettings();
  const source = settings?.line_login_source ?? "environment";
  const channelId =
    source === "backend"
      ? settings?.line_login_channel_id ?? ""
      : process.env.LINE_LOGIN_CHANNEL_ID ?? "";
  const channelSecret =
    source === "backend"
      ? decryptSecret(settings?.line_login_channel_secret_ciphertext ?? null)
      : process.env.LINE_LOGIN_CHANNEL_SECRET ?? "";
  return {
    source,
    enabled: source !== "disabled",
    configured: Boolean(channelId && channelSecret),
    channelId,
    channelSecret,
  } satisfies RuntimeConfiguration & {
    channelId: string;
    channelSecret: string;
  };
}

export async function getLineMessagingConfiguration() {
  const settings = await readStoredSettings();
  const source = settings?.line_messaging_source ?? "environment";
  const channelAccessToken =
    source === "backend"
      ? decryptSecret(settings?.line_channel_access_token_ciphertext ?? null)
      : process.env.LINE_CHANNEL_ACCESS_TOKEN ?? "";
  return {
    source,
    enabled: source !== "disabled",
    configured: Boolean(channelAccessToken),
    channelAccessToken,
  } satisfies RuntimeConfiguration & { channelAccessToken: string };
}

export async function getTurnstileConfiguration() {
  const settings = await readStoredSettings();
  const source = settings?.turnstile_source ?? "environment";
  const siteKey =
    source === "backend"
      ? settings?.turnstile_site_key ?? ""
      : process.env.TURNSTILE_SITE_KEY ?? "";
  const secretKey =
    source === "backend"
      ? decryptSecret(settings?.turnstile_secret_key_ciphertext ?? null)
      : process.env.TURNSTILE_SECRET_KEY ?? "";
  const expectedHostname =
    source === "backend"
      ? settings?.turnstile_expected_hostname ?? ""
      : process.env.TURNSTILE_EXPECTED_HOSTNAME ?? "";
  return {
    source,
    enabled: source !== "disabled",
    configured: Boolean(siteKey && secretKey),
    siteKey,
    secretKey,
    expectedHostname,
  } satisfies RuntimeConfiguration & {
    siteKey: string;
    secretKey: string;
    expectedHostname: string;
  };
}

export async function getPromptPayConfiguration() {
  const settings = await readStoredSettings();
  const source = settings?.promptpay_source ?? "environment";
  const promptPayId =
    source === "backend"
      ? decryptSecret(settings?.promptpay_id_ciphertext ?? null)
      : process.env.PROMPTPAY_ID ?? "";
  return {
    source,
    enabled: source !== "disabled",
    configured: Boolean(promptPayId),
    promptPayId,
  } satisfies RuntimeConfiguration & { promptPayId: string };
}

export async function getSocialLoginVisibility() {
  const settings = await readStoredSettings();
  return {
    google: settings?.google_login_visible ?? true,
    facebook: settings?.facebook_login_visible ?? true,
  };
}

export type SupabaseSocialProviderStatus = {
  reachable: boolean;
  google: boolean;
  facebook: boolean;
};

export async function getSupabaseSocialProviderStatus(): Promise<SupabaseSocialProviderStatus> {
  const baseUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const apiKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";
  if (!baseUrl || !apiKey) {
    return { reachable: false, google: false, facebook: false };
  }

  try {
    const response = await fetch(
      `${baseUrl.replace(/\/$/, "")}/auth/v1/settings`,
      {
        headers: { apikey: apiKey },
        cache: "no-store",
        signal: AbortSignal.timeout(5_000),
      },
    );
    if (!response.ok) {
      return { reachable: false, google: false, facebook: false };
    }
    const data = (await response.json()) as {
      external?: Record<string, boolean>;
    };
    return {
      reachable: true,
      google: data.external?.google === true,
      facebook: data.external?.facebook === true,
    };
  } catch {
    return { reachable: false, google: false, facebook: false };
  }
}

export function getIntegrationCallbackUrls() {
  const siteUrl = (
    process.env.SITE_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    ""
  ).replace(/\/$/, "");
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(
    /\/$/,
    "",
  );
  return {
    strava: siteUrl ? `${siteUrl}/api/strava/callback` : "/api/strava/callback",
    line: siteUrl ? `${siteUrl}/api/line/callback` : "/api/line/callback",
    supabase: supabaseUrl
      ? `${supabaseUrl}/auth/v1/callback`
      : "/auth/v1/callback",
  };
}
