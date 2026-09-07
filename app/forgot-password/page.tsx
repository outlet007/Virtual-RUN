import Link from "next/link";
import { Mail } from "lucide-react";
import { AuthSubmitButton } from "@/components/auth-submit-button";
import { TurnstileField } from "@/components/turnstile-field";
import { Card, HeadingIcon, Input, Label } from "@/components/ui";
import { requestPasswordReset } from "@/lib/actions/password-recovery";
import { getLocale } from "@/lib/i18n/server";
import { tx } from "@/lib/i18n/shared";

const errorMessages = {
  invalid_email: {
    th: "กรุณากรอกอีเมลให้ถูกต้อง",
    en: "Enter a valid email address.",
  },
  security_check: {
    th: "กรุณายืนยันการตรวจสอบความปลอดภัยแล้วลองใหม่",
    en: "Complete the security check and try again.",
  },
} as const;

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const [{ error, sent }, locale] = await Promise.all([searchParams, getLocale()]);
  const turnstileSiteKey = process.env.TURNSTILE_SITE_KEY ?? "";
  const message = errorMessages[error as keyof typeof errorMessages];

  return (
    <div className="mx-auto max-w-sm space-y-6 pt-8">
      <div>
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold">
          <HeadingIcon name="key" />
          {tx(locale, "ลืมรหัสผ่าน", "Forgot password")}
        </h1>
        <p className="mt-1 text-sm text-ink/50">
          {tx(
            locale,
            "กรอกอีเมลที่ใช้สมัคร ระบบจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่",
            "Enter your account email and we will send a password reset link.",
          )}
        </p>
      </div>

      {sent === "1" ? (
        <Card className="space-y-4">
          <div className="rounded-xl bg-primary-soft px-4 py-3 text-sm text-ink" role="status">
            {tx(
              locale,
              "หากอีเมลนี้มีบัญชีอยู่ คุณจะได้รับลิงก์ตั้งรหัสผ่านใหม่ โปรดตรวจสอบกล่องจดหมายและโฟลเดอร์สแปม",
              "If an account exists for this email, you will receive a password reset link. Check your inbox and spam folder.",
            )}
          </div>
          <Link
            href="/login"
            className="block text-center text-sm font-semibold text-primary-dark hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            {tx(locale, "กลับไปหน้าเข้าสู่ระบบ", "Back to sign in")}
          </Link>
        </Card>
      ) : (
        <form action={requestPasswordReset}>
          <Card className="space-y-4">
            {message && (
              <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                {locale === "en" ? message.en : message.th}
              </div>
            )}

            <div>
              <Label htmlFor="recovery-email">{tx(locale, "อีเมล", "Email")}</Label>
              <div className="relative">
                <Mail
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink/35"
                  aria-hidden="true"
                />
                <Input
                  id="recovery-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="your@email.com"
                  className="pl-10"
                  maxLength={254}
                  required
                />
              </div>
            </div>

            {turnstileSiteKey ? (
              <TurnstileField
                siteKey={turnstileSiteKey}
                action="password-recovery"
                locale={locale}
              />
            ) : (
              <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                {tx(
                  locale,
                  "ระบบตรวจสอบความปลอดภัยยังไม่ได้ตั้งค่า",
                  "Security verification is not configured.",
                )}
              </p>
            )}

            <AuthSubmitButton
              label={tx(locale, "ส่งลิงก์ตั้งรหัสผ่านใหม่", "Send reset link")}
              pendingLabel={tx(locale, "กำลังส่ง...", "Sending...")}
              icon="send"
              disabled={!turnstileSiteKey}
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
