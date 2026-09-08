import Link from "next/link";
import Image from "next/image";
import { Card, Button, HeadingIcon, Input, Label, LinkButton } from "@/components/ui";
import { signUp } from "@/lib/actions/auth";
import { PrivacyPolicyModal } from "@/components/privacy-policy-modal";
import { getLocale } from "@/lib/i18n/server";
import { pickLocalized, tx } from "@/lib/i18n/shared";
import { getSystemSettings } from "@/lib/system-settings";
import { getSocialLoginVisibility } from "@/lib/integration-settings";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const [locale, settings, socialLogin] = await Promise.all([
    getLocale(),
    getSystemSettings(),
    getSocialLoginVisibility(),
  ]);
  const privacyPolicyText = pickLocalized(
    locale,
    settings.privacy_policy_text,
    settings.privacy_policy_text_en,
  );

  return (
    <div className="mx-auto max-w-sm space-y-6 pt-8">
      <div>
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold">
          <HeadingIcon name="register" />
          {tx(locale, "สมัครสมาชิก", "Sign up")}
        </h1>
        <p className="mt-1 text-sm text-ink/50">{tx(locale, "เริ่มเก็บระยะและสะสมเหรียญ", "Start tracking distance and collecting medals")}</p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form action={signUp}>
        <Card className="space-y-4">
          <div>
            <Label>{tx(locale, "ชื่อ", "Name")}</Label>
            <Input name="name" required />
          </div>
          <div>
            <Label>{tx(locale, "อีเมล", "Email")}</Label>
            <Input name="email" type="email" required />
          </div>
          <div>
            <Label>{tx(locale, "รหัสผ่าน", "Password")}</Label>
            <Input name="password" type="password" minLength={6} required />
          </div>

          <div className="space-y-2 border-t border-lane pt-3">
            <div className="flex items-start gap-2 text-sm text-ink/70">
              <input id="privacy-consent" type="checkbox" name="privacy" className="mt-1" required />
              <div>
                <label htmlFor="privacy-consent">{tx(locale, "ยอมรับ", "I accept")} </label>
                <PrivacyPolicyModal locale={locale} policyText={privacyPolicyText} />{" "}
                <label htmlFor="privacy-consent">
                  {tx(locale, "และข้อกำหนดการใช้งาน (จำเป็น)", "and terms of use (required)")}
                </label>
              </div>
            </div>
            <label className="flex items-start gap-2 text-sm text-ink/70">
              <input type="checkbox" name="marketing" className="mt-1" />
              <span>{tx(locale, "ยินยอมรับข่าวสารและโปรโมชัน (ไม่บังคับ)", "Receive news and promotions (optional)")}</span>
            </label>
          </div>

          <Button className="w-full" type="submit" icon="userPlus">
            {tx(locale, "สมัครสมาชิก", "Sign up")}
          </Button>

          {(socialLogin.google || socialLogin.facebook) && (
            <div className="flex items-center gap-3 text-xs text-ink/40">
              <div className="h-px flex-1 bg-lane" />
              {tx(locale, "หรือ", "or")}
              <div className="h-px flex-1 bg-lane" />
            </div>
          )}

          {(socialLogin.google || socialLogin.facebook) && (
            <div className="space-y-2">
              {socialLogin.google && (
                <LinkButton href="/auth/google" variant="ghost" className="w-full gap-2.5">
                  <Image
                    src="/auth/google.svg"
                    alt=""
                    width={20}
                    height={20}
                    className="h-5 w-5 shrink-0"
                    aria-hidden="true"
                  />
                  {tx(locale, "สมัครสมาชิกด้วย Google", "Sign up with Google")}
                </LinkButton>
              )}
              {socialLogin.facebook && (
                <LinkButton href="/auth/facebook" variant="ghost" className="w-full gap-2.5">
                  <Image
                    src="/auth/facebook.svg"
                    alt=""
                    width={20}
                    height={20}
                    className="h-5 w-5 shrink-0"
                    aria-hidden="true"
                  />
                  {tx(locale, "สมัครสมาชิกด้วย Facebook", "Sign up with Facebook")}
                </LinkButton>
              )}
            </div>
          )}
        </Card>
      </form>

      <p className="text-center text-sm text-ink/50">
        {tx(locale, "มีบัญชีอยู่แล้ว?", "Already have an account?")}{" "}
        <Link href="/login" className="font-semibold text-primary-dark hover:underline">
          {tx(locale, "เข้าสู่ระบบ", "Sign in")}
        </Link>
      </p>
    </div>
  );
}
