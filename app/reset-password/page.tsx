import Link from "next/link";
import { cookies } from "next/headers";
import { LockKeyhole } from "lucide-react";
import { AuthSubmitButton } from "@/components/auth-submit-button";
import { Card, HeadingIcon, Input, Label, LinkButton } from "@/components/ui";
import { updateRecoveredPassword } from "@/lib/actions/password-recovery";
import { getLocale } from "@/lib/i18n/server";
import { tx } from "@/lib/i18n/shared";
import { MIN_PASSWORD_LENGTH, PASSWORD_RECOVERY_COOKIE } from "@/lib/password-recovery";
import { createClient } from "@/lib/supabase/server";

const errorMessages = {
  invalid_or_expired: {
    th: "ลิงก์ตั้งรหัสผ่านไม่ถูกต้องหรือหมดอายุแล้ว กรุณาขอลิงก์ใหม่",
    en: "This password reset link is invalid or has expired. Request a new link.",
  },
  password_too_short: {
    th: `รหัสผ่านต้องมีอย่างน้อย ${MIN_PASSWORD_LENGTH} ตัวอักษร`,
    en: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
  },
  password_mismatch: {
    th: "รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน",
    en: "Password and confirmation do not match.",
  },
  update_failed: {
    th: "ไม่สามารถตั้งรหัสผ่านใหม่ได้ ลิงก์อาจหมดอายุแล้ว กรุณาขอลิงก์ใหม่",
    en: "We could not update your password. The link may have expired; request a new one.",
  },
} as const;

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ error }, locale, cookieStore, supabase] = await Promise.all([
    searchParams,
    getLocale(),
    cookies(),
    createClient(),
  ]);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const hasRecoveryGrant = cookieStore.get(PASSWORD_RECOVERY_COOKIE)?.value === "1";
  const canReset = Boolean(user && hasRecoveryGrant);
  const message = errorMessages[error as keyof typeof errorMessages];

  return (
    <div className="mx-auto max-w-sm space-y-6 pt-8">
      <div>
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold">
          <HeadingIcon name="key" />
          {tx(locale, "ตั้งรหัสผ่านใหม่", "Set a new password")}
        </h1>
        <p className="mt-1 text-sm text-ink/50">
          {tx(
            locale,
            "กำหนดรหัสผ่านใหม่สำหรับบัญชีของคุณ",
            "Choose a new password for your account.",
          )}
        </p>
      </div>

      {!canReset ? (
        <Card className="space-y-4">
          <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            {locale === "en"
              ? errorMessages.invalid_or_expired.en
              : errorMessages.invalid_or_expired.th}
          </div>
          <LinkButton href="/forgot-password" className="w-full" icon="refresh">
            {tx(locale, "ขอลิงก์ใหม่", "Request a new link")}
          </LinkButton>
        </Card>
      ) : (
        <form action={updateRecoveredPassword}>
          <Card className="space-y-4">
            {message && (
              <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                {locale === "en" ? message.en : message.th}
              </div>
            )}

            <div>
              <Label htmlFor="new-password">{tx(locale, "รหัสผ่านใหม่", "New password")}</Label>
              <div className="relative">
                <LockKeyhole
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink/35"
                  aria-hidden="true"
                />
                <Input
                  id="new-password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  minLength={MIN_PASSWORD_LENGTH}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="confirm-password">
                {tx(locale, "ยืนยันรหัสผ่านใหม่", "Confirm new password")}
              </Label>
              <div className="relative">
                <LockKeyhole
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink/35"
                  aria-hidden="true"
                />
                <Input
                  id="confirm-password"
                  name="confirm_password"
                  type="password"
                  autoComplete="new-password"
                  minLength={MIN_PASSWORD_LENGTH}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <AuthSubmitButton
              label={tx(locale, "บันทึกรหัสผ่านใหม่", "Save new password")}
              pendingLabel={tx(locale, "กำลังบันทึก...", "Saving...")}
              icon="save"
            />
          </Card>
        </form>
      )}

      <p className="text-center text-sm text-ink/50">
        <Link
          href="/login"
          className="font-semibold text-primary-dark hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        >
          {tx(locale, "กลับไปหน้าเข้าสู่ระบบ", "Back to sign in")}
        </Link>
      </p>
    </div>
  );
}
