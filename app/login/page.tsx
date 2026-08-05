import Link from "next/link";
import Image from "next/image";
import Script from "next/script";
import { LockKeyhole, Mail } from "lucide-react";
import { Card, Button, Input, Label, LinkButton } from "@/components/ui";
import { logIn } from "@/lib/actions/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const turnstileSiteKey = process.env.TURNSTILE_SITE_KEY ?? "";

  return (
    <div className="mx-auto max-w-sm space-y-6 pt-8">
      <div>
        <h1 className="font-display text-2xl font-bold">เข้าสู่ระบบ</h1>
        <p className="mt-1 text-sm text-ink/50">ยินดีต้อนรับกลับมา</p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form action={logIn}>
        <Card className="space-y-4">
          <div>
            <Label htmlFor="email">อีเมล</Label>
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
            <Label htmlFor="password">รหัสผ่าน</Label>
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
                placeholder="กรอกรหัสผ่าน"
                className="pl-10"
                required
              />
            </div>
          </div>

          <Script
            src="https://challenges.cloudflare.com/turnstile/v0/api.js"
            strategy="afterInteractive"
          />
          {turnstileSiteKey ? (
            <div
              className="cf-turnstile min-h-[68px] overflow-hidden rounded-xl border border-lane bg-white"
              data-sitekey={turnstileSiteKey}
              data-action="login"
              data-theme="light"
              data-size="flexible"
              aria-label="การตรวจสอบความปลอดภัย"
            />
          ) : (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              ระบบตรวจสอบความปลอดภัยยังไม่ได้ตั้งค่า
            </p>
          )}

          <Button className="w-full" type="submit" disabled={!turnstileSiteKey} icon="login">
            เข้าสู่ระบบ
          </Button>

          <div className="flex items-center gap-3 text-xs text-ink/40">
            <div className="h-px flex-1 bg-lane" />
            หรือ
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
              เข้าสู่ระบบด้วย Google
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
              เข้าสู่ระบบด้วย Facebook
            </LinkButton>
          </div>
        </Card>
      </form>

      <p className="text-center text-sm text-ink/50">
        ยังไม่มีบัญชี?{" "}
        <Link href="/signup" className="font-semibold text-primary-dark hover:underline">
          สมัครสมาชิก
        </Link>
      </p>
    </div>
  );
}
