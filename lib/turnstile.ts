const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const CLOUDFLARE_ALWAYS_PASS_TEST_SECRET = "1x0000000000000000000000000000000AA";

type TurnstileVerifyResponse = {
  success: boolean;
  action?: string;
  hostname?: string;
};

export async function verifyTurnstileToken(token: string) {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  if (!secretKey || !token || token.length > 2048) return false;

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
    const expectedHostname = process.env.TURNSTILE_EXPECTED_HOSTNAME;
    const isOfficialTestKey = secretKey === CLOUDFLARE_ALWAYS_PASS_TEST_SECRET;

    return (
      result.success &&
      (isOfficialTestKey || result.action === "login") &&
      (!expectedHostname || result.hostname === expectedHostname)
    );
  } catch {
    return false;
  }
}
