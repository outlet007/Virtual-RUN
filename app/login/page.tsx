import Link from "next/link";
import Image from "next/image";
import { LockKeyhole, Mail } from "lucide-react";
import { TurnstileField } from "@/components/turnstile-field";
import { Card, Button, HeadingIcon, Input, Label, LinkButton } from "@/components/ui";
import { logIn } from "@/lib/actions/auth";
import { getLocale } from "@/lib/i18n/server";
import { tx } from "@/lib/i18n/shared";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; password_reset?: string }>;
}) {
  const { error, password_reset: passwordReset } = await searchParams;
  const locale = await getLocale();
  const turnstileSiteKey = process.env.TURNSTILE_SITE_KEY ?? "";

  return (
    <div className="mx-auto max-w-sm space-y-6 pt-8">
      <div>
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold">
          <HeadingIcon name="login" />
          {tx(locale, "เข้าสู่ระบบ", "Sign in")}
        </h1>
        <p className="mt-1 text-sm text-ink/50">{tx(locale, "ยินดีต้อนรับกลับมา", "Welcome back")}</p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      {passwordReset === "1" && (
        <div className="rounded-xl bg-primary-soft px-4 py-3 text-sm text-ink" role="status">
          {tx(
            locale,
            "ตั้งรหัสผ่านใหม่เรียบร้อยแล้ว กรุณาเข้าสู่ระบบ",
            "Your password has been reset. Sign in with your new password.",
          )}
        </div>
      )}

      <form action={logIn}>
        <Card className="space-y-4">
          <div>
            <Label htmlFor="email">{tx(locale, "อีเมล", "Email")}</Label>
            <div className="relative">
              <Mail
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35"
                aria-hidden="true"
              />
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="your@email.com"
                className="pl-10"
                required
              />
            </div>
          </div>
          <div>
            <Label htmlFor="password">{tx(locale, "รหัสผ่าน", "Password")}</Label>
            <div className="relative">
              <LockKeyhole
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35"
                aria-hidden="true"
              />
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder={tx(locale, "กรอกรหัสผ่าน", "Enter password")}
                className="pl-10"
                required
              />
            </div>
            <div className="mt-2 text-right">
              <Link
                href="/forgot-password"
                className="text-sm font-semibold text-primary-dark hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              >
                {tx(locale, "ลืมรหัสผ่าน?", "Forgot password?")}
              </Link>
            </div>
          </div>

          {turnstileSiteKey ? (
            <TurnstileField siteKey={turnstileSiteKey} action="login" locale={locale} />
          ) : (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {tx(locale, "ระบบตรวจสอบความปลอดภัยยังไม่ได้ตั้งค่า", "Security verification is not configured.")}
            </p>
          )}

          <Button className="w-full" type="submit" disabled={!turnstileSiteKey} icon="login">
            {tx(locale, "เข้าสู่ระบบ", "Sign in")}
          </Button>

          <div className="flex items-center gap-3 text-xs text-ink/40">
            <div className="h-px flex-1 bg-lane" />
            {tx(locale, "หรือ", "or")}
            <div className="h-px flex-1 bg-lane" />
          </div>

          <div className="space-y-2">
            <LinkButton href="/auth/google" variant="ghost" className="w-full gap-2.5">
              <Image
                src="/auth/google.svg"
                alt=""
                width={20}
                height={20}
                className="h-5 w-5 shrink-0"
                aria-hidden="true"
              />
              {tx(locale, "เข้าสู่ระบบด้วย Google", "Continue with Google")}
            </LinkButton>
            <LinkButton href="/auth/facebook" variant="ghost" className="w-full gap-2.5">
              <Image
                src="/auth/facebook.svg"
                alt=""
                width={20}
                height={20}
                className="h-5 w-5 shrink-0"
                aria-hidden="true"
              />
              {tx(locale, "เข้าสู่ระบบด้วย Facebook", "Continue with Facebook")}
            </LinkButton>
          </div>
        </Card>
      </form>

      <p className="text-center text-sm text-ink/50">
        {tx(locale, "ยังไม่มีบัญชี?", "No account yet?")}{" "}
        <Link href="/signup" className="font-semibold text-primary-dark hover:underline">
          {tx(locale, "สมัครสมาชิก", "Sign up")}
        </Link>
      </p>
    </div>
  );
}
