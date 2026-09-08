import "server-only";

import { getTurnstileConfiguration } from "@/lib/integration-settings";

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const CLOUDFLARE_ALWAYS_PASS_TEST_SECRET = "1x0000000000000000000000000000000AA";

type TurnstileVerifyResponse = {
  success: boolean;
  action?: string;
  hostname?: string;
};

export async function verifyTurnstileToken(token: string, expectedAction = "login") {
  const config = await getTurnstileConfiguration();
  if (!config.enabled) return true;
  const secretKey = config.secretKey;
  if (!config.configured || !token || token.length > 2048) return false;

  const body = new FormData();
  body.set("secret", secretKey);
  body.set("response", token);
  body.set("idempotency_key", crypto.randomUUID());

  try {
    const response = await fetch(SITEVERIFY_URL, {
      method: "POST",
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return false;

    const result = (await response.json()) as TurnstileVerifyResponse;
    const expectedHostname = config.expectedHostname;
    const isOfficialTestKey = secretKey === CLOUDFLARE_ALWAYS_PASS_TEST_SECRET;

    return (
      result.success &&
      (isOfficialTestKey || result.action === expectedAction) &&
      (!expectedHostname || result.hostname === expectedHostname)
    );
  } catch {
    return false;
  }
}
