"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSuperAdmin } from "@/lib/auth/admin";
import { parseIntegrationSource } from "@/lib/integration-configuration";
import { saveIntegrationSettings } from "@/lib/integration-settings";

function integrationsError(message: string): never {
  redirect(`/admin/integrations?error=${encodeURIComponent(message)}`);
}

export async function updateIntegrationSettings(formData: FormData) {
  const { user } = await requireSuperAdmin();
  const stravaSource = parseIntegrationSource(formData.get("strava_source"));
  const lineLoginSource = parseIntegrationSource(formData.get("line_login_source"));
  const lineMessagingSource = parseIntegrationSource(
    formData.get("line_messaging_source"),
  );
  const turnstileSource = parseIntegrationSource(formData.get("turnstile_source"));
  const promptpaySource = parseIntegrationSource(formData.get("promptpay_source"));
  if (
    !stravaSource ||
    !lineLoginSource ||
    !lineMessagingSource ||
    !turnstileSource ||
    !promptpaySource
  ) {
    integrationsError("แหล่งที่มาของการตั้งค่าไม่ถูกต้อง");
  }

  try {
    await saveIntegrationSettings({
      stravaSource,
      stravaClientId: String(formData.get("strava_client_id") ?? "").trim(),
      stravaClientSecret: String(formData.get("strava_client_secret") ?? ""),
      clearStravaClientSecret:
        formData.get("clear_strava_client_secret") === "on",
      stravaWebhookVerifyToken: String(
        formData.get("strava_webhook_verify_token") ?? "",
      ),
      clearStravaWebhookVerifyToken:
        formData.get("clear_strava_webhook_verify_token") === "on",
      lineLoginSource,
      lineLoginChannelId: String(
        formData.get("line_login_channel_id") ?? "",
      ).trim(),
      lineLoginChannelSecret: String(
        formData.get("line_login_channel_secret") ?? "",
      ),
      clearLineLoginChannelSecret:
        formData.get("clear_line_login_channel_secret") === "on",
      lineMessagingSource,
      lineChannelAccessToken: String(
        formData.get("line_channel_access_token") ?? "",
      ),
      clearLineChannelAccessToken:
        formData.get("clear_line_channel_access_token") === "on",
      turnstileSource,
      turnstileSiteKey: String(formData.get("turnstile_site_key") ?? "").trim(),
      turnstileSecretKey: String(formData.get("turnstile_secret_key") ?? ""),
      clearTurnstileSecretKey:
        formData.get("clear_turnstile_secret_key") === "on",
      turnstileExpectedHostname: String(
        formData.get("turnstile_expected_hostname") ?? "",
      )
        .trim()
        .toLowerCase(),
      promptpaySource,
      promptpayId: String(formData.get("promptpay_id") ?? "").trim(),
      clearPromptpayId: formData.get("clear_promptpay_id") === "on",
      googleLoginVisible: formData.get("google_login_visible") === "on",
      facebookLoginVisible: formData.get("facebook_login_visible") === "on",
      updatedBy: user.id,
    });
  } catch (error) {
    console.error("Unable to save integration settings", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
    integrationsError(
      error instanceof Error
        ? error.message
        : "บันทึกการตั้งค่าการเชื่อมต่อไม่สำเร็จ",
    );
  }

  revalidatePath("/admin/integrations");
  revalidatePath("/login");
  revalidatePath("/signup");
  redirect("/admin/integrations?saved=1");
}
