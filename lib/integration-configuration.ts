export const INTEGRATION_SOURCES = ["environment", "backend", "disabled"] as const;
export type IntegrationSource = (typeof INTEGRATION_SOURCES)[number];

export type IntegrationSettingsInput = {
  stravaSource: IntegrationSource;
  stravaClientId: string;
  stravaClientSecret: string;
  clearStravaClientSecret: boolean;
  stravaWebhookVerifyToken: string;
  clearStravaWebhookVerifyToken: boolean;
  lineLoginSource: IntegrationSource;
  lineLoginChannelId: string;
  lineLoginChannelSecret: string;
  clearLineLoginChannelSecret: boolean;
  lineMessagingSource: IntegrationSource;
  lineChannelAccessToken: string;
  clearLineChannelAccessToken: boolean;
  turnstileSource: IntegrationSource;
  turnstileSiteKey: string;
  turnstileSecretKey: string;
  clearTurnstileSecretKey: boolean;
  turnstileExpectedHostname: string;
  promptpaySource: IntegrationSource;
  promptpayId: string;
  clearPromptpayId: boolean;
  googleLoginVisible: boolean;
  facebookLoginVisible: boolean;
};

export type ExistingIntegrationSecrets = {
  stravaClientSecret: boolean;
  stravaWebhookVerifyToken: boolean;
  lineLoginChannelSecret: boolean;
  lineChannelAccessToken: boolean;
  turnstileSecretKey: boolean;
  promptpayId: boolean;
};

export function parseIntegrationSource(value: FormDataEntryValue | null) {
  const source = String(value ?? "");
  return INTEGRATION_SOURCES.includes(source as IntegrationSource)
    ? (source as IntegrationSource)
    : null;
}

export function normalizePromptPayId(value: string) {
  return value.replace(/[\s-]/g, "");
}

function hasSecret(value: string, clear: boolean, existing: boolean) {
  return Boolean(value) || (!clear && existing);
}

export function validateIntegrationSettingsInput(
  input: IntegrationSettingsInput,
  existing: ExistingIntegrationSecrets,
) {
  if (input.stravaClientId.length > 255) return "Strava Client ID ยาวเกินไป";
  if (input.stravaSource === "backend") {
    if (!input.stravaClientId) return "กรุณากรอก Strava Client ID";
    if (!hasSecret(input.stravaClientSecret, input.clearStravaClientSecret, existing.stravaClientSecret)) {
      return "กรุณากรอก Strava Client Secret";
    }
    if (!hasSecret(input.stravaWebhookVerifyToken, input.clearStravaWebhookVerifyToken, existing.stravaWebhookVerifyToken)) {
      return "กรุณากรอก Strava Webhook Verify Token";
    }
  }

  if (input.lineLoginChannelId.length > 255) return "LINE Login Channel ID ยาวเกินไป";
  if (input.lineLoginSource === "backend") {
    if (!input.lineLoginChannelId) return "กรุณากรอก LINE Login Channel ID";
    if (!hasSecret(input.lineLoginChannelSecret, input.clearLineLoginChannelSecret, existing.lineLoginChannelSecret)) {
      return "กรุณากรอก LINE Login Channel Secret";
    }
  }
  if (
    input.lineMessagingSource === "backend" &&
    !hasSecret(input.lineChannelAccessToken, input.clearLineChannelAccessToken, existing.lineChannelAccessToken)
  ) {
    return "กรุณากรอก LINE Messaging Channel Access Token";
  }

  if (input.turnstileSiteKey.length > 255) return "Turnstile Site Key ยาวเกินไป";
  if (
    input.turnstileExpectedHostname &&
    (!/^[a-z0-9.-]+$/i.test(input.turnstileExpectedHostname) ||
      input.turnstileExpectedHostname.length > 253)
  ) {
    return "Turnstile hostname ไม่ถูกต้อง";
  }
  if (input.turnstileSource === "backend") {
    if (!input.turnstileSiteKey) return "กรุณากรอก Turnstile Site Key";
    if (!hasSecret(input.turnstileSecretKey, input.clearTurnstileSecretKey, existing.turnstileSecretKey)) {
      return "กรุณากรอก Turnstile Secret Key";
    }
  }

  const promptpayId = normalizePromptPayId(input.promptpayId);
  if (
    input.promptpaySource === "backend" &&
    !hasSecret(promptpayId, input.clearPromptpayId, existing.promptpayId)
  ) {
    return "กรุณากรอก PromptPay ID";
  }
  if (promptpayId && !/^(?:\d{10}|\d{13}|\d{15})$/.test(promptpayId)) {
    return "PromptPay ID ต้องเป็นตัวเลข 10, 13 หรือ 15 หลัก";
  }

  const secretValues = [
    input.stravaClientSecret,
    input.stravaWebhookVerifyToken,
    input.lineLoginChannelSecret,
    input.lineChannelAccessToken,
    input.turnstileSecretKey,
  ];
  if (secretValues.some((value) => value.length > 8192)) return "Secret ยาวเกินค่าที่ระบบรองรับ";
  return null;
}
