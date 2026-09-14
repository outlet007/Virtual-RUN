import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, Button } from "@/components/ui";
import { acceptConsent } from "@/lib/actions/auth";
import { getLocale } from "@/lib/i18n/server";
import { tx } from "@/lib/i18n/shared";

export const dynamic = "force-dynamic";

export default async function ConsentPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error: pageError } = await searchParams;
  const [supabase, locale] = await Promise.all([createClient(), getLocale()]);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: consent, error: consentError } = await supabase
    .from("consents")
    .select("id")
    .eq("user_id", user.id)
    .eq("type", "privacy")
    .limit(1)
    .maybeSingle();
  if (consentError) {
    console.error("Consent lookup failed on consent page", {
      code: consentError.code,
      message: consentError.message,
    });
  }
  if (consent) redirect("/dashboard");

  const error =
    pageError ??
    (consentError ? "ตรวจสอบข้อมูลการยินยอมไม่สำเร็จ กรุณาลองอีกครั้ง" : undefined);

  return (
    <div className="mx-auto max-w-lg space-y-6 pt-8">
      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <form action={acceptConsent}>
        <Card className="space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <h1 className="font-display text-lg font-bold">{tx(locale, "การยินยอมเปิดเผยข้อมูล *", "Data consent *")}</h1>
          </div>

          <p className="text-sm leading-relaxed text-ink/70">
            {tx(locale, "ข้าพเจ้าตกลงและยินยอมให้ Virtual RUN เก็บรวบรวม ใช้ ประมวลผล และเปิดเผยข้อมูลส่วนบุคคลของข้าพเจ้า เพื่อวัตถุประสงค์ในการลงทะเบียนเข้าร่วมกิจกรรมวิ่ง บันทึกและตรวจสอบผลการวิ่ง จัดส่งเหรียญ/ของรางวัล และติดต่อสื่อสารที่เกี่ยวข้องกับการเข้าร่วมกิจกรรม ทั้งนี้เป็นไปตามนโยบายคุ้มครองข้อมูลส่วนบุคคลของ Virtual RUN โดยรายละเอียดปรากฏตามนโยบายคุ้มครองข้อมูลส่วนบุคคลในเว็บไซต์", "I consent to Virtual RUN collecting, using, processing, and disclosing my personal data to register me for running activities, record and verify results, deliver medals or rewards, and communicate about activities, in accordance with the privacy policy published on this website.")}
          </p>

          <label className="flex items-start gap-2 border-t border-lane pt-4 text-sm text-ink/70">
            <input type="checkbox" name="accept" className="mt-1" required />
            <span>{tx(locale, "ข้าพเจ้าได้อ่านและยอมรับการยินยอมเปิดเผยข้อมูลแล้ว", "I have read and accept this data consent.")}</span>
          </label>

          <Button className="w-full" type="submit" icon="shield">
            {tx(locale, "ยืนยัน", "Confirm")}
          </Button>
        </Card>
      </form>
    </div>
  );
}
