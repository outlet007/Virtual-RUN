"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  getNewPasswordError,
  isValidRecoveryEmail,
  normalizeRecoveryEmail,
  PASSWORD_RECOVERY_COOKIE,
} from "@/lib/password-recovery";
import { createSiteUrl } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/server";
import { verifyTurnstileToken } from "@/lib/turnstile";

export async function requestPasswordReset(formData: FormData) {
  const email = normalizeRecoveryEmail(formData.get("email"));
  const turnstileToken = String(formData.get("cf-turnstile-response") ?? "");

  if (!isValidRecoveryEmail(email)) {
    redirect("/forgot-password?error=invalid_email");
  }

  if (!(await verifyTurnstileToken(turnstileToken, "password-recovery"))) {
    redirect("/forgot-password?error=security_check");
  }

  const requestHeaders = await headers();
  const request = new Request("http://localhost", { headers: requestHeaders });
  const redirectTo = createSiteUrl(request, "/auth/recovery").toString();
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

  // Keep the response identical so this endpoint never reveals account existence.
  if (error) {
    console.error("Password recovery email request failed", {
      code: error.code,
      status: error.status,
    });
  }

  redirect("/forgot-password?sent=1");
}

export async function updateRecoveredPassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirm_password") ?? "");
  const passwordError = getNewPasswordError(password, confirmation);

  if (passwordError) {
    redirect(`/reset-password?error=${passwordError}`);
  }

  const cookieStore = await cookies();
  const hasRecoveryGrant = cookieStore.get(PASSWORD_RECOVERY_COOKIE)?.value === "1";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!hasRecoveryGrant || !user) {
    redirect("/reset-password?error=invalid_or_expired");
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    redirect("/reset-password?error=update_failed");
  }

  cookieStore.delete(PASSWORD_RECOVERY_COOKIE);
  await supabase.auth.signOut();
  redirect("/login?password_reset=1");
}
