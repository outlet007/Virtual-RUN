import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, HeadingIcon, Input, Label, LinkButton } from "@/components/ui";
import { createSubmission } from "@/lib/actions/submission";
import { SubmissionSubmitButton } from "@/components/submission-submit-button";
import { getLocale } from "@/lib/i18n/server";
import { pickLocalized, tx } from "@/lib/i18n/shared";
import { isEventSubmissionOpen } from "@/lib/event-registration";

export const dynamic = "force-dynamic";

type Reg = {
  id: string;
  packages: { name: string; name_en: string | null } | null;
  events: { title: string; title_en: string | null; end_date: string } | null;
};

export default async function SubmitForRegistrationPage({
  params,
  searchParams,
}: {
  params: Promise<{ registrationId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { registrationId } = await params;
  const { error } = await searchParams;
  const [supabase, locale] = await Promise.all([createClient(), getLocale()]);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: regRaw } = await supabase
    .from("registrations")
    .select("id, packages(name, name_en), events(title, title_en, end_date)")
    .eq("id", registrationId)
    .eq("user_id", user.id)
    .eq("status", "confirmed")
    .maybeSingle();

  if (!regRaw) notFound();
  const reg = regRaw as unknown as Reg;
  if (!reg.events) notFound();
  if (!isEventSubmissionOpen(reg.events.end_date)) {
    redirect("/dashboard/events?tab=past");
  }
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="max-w-lg space-y-6">
      <LinkButton href="/dashboard/events" variant="ghost" icon="chevronLeft">
        {tx(locale, "งานของฉัน", "My events")}
      </LinkButton>
      <div>
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold">
          <HeadingIcon name="upload" />
          {tx(locale, "บันทึกผลวิ่ง", "Submit activity")}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {reg.events ? pickLocalized(locale, reg.events.title, reg.events.title_en) : ""}
          {" — "}
          {reg.packages ? pickLocalized(locale, reg.packages.name, reg.packages.name_en) : ""}
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form action={createSubmission}>
        <Card className="space-y-4">
          <input type="hidden" name="registration_id" value={reg.id} />

          <div>
            <Label>{tx(locale, "ประเภท", "Type")}</Label>
            <select
              name="activity_type"
              className="h-11 w-full rounded-xl border border-lane bg-white px-3 text-sm outline-none focus:border-primary"
            >
              <option value="run">{tx(locale, "วิ่ง", "Run")}</option>
              <option value="walk">{tx(locale, "เดิน", "Walk")}</option>
            </select>
          </div>

          <div>
            <Label>{tx(locale, "ระยะ (km)", "Distance (km)")}</Label>
            <Input
              name="distance_km"
              type="number"
              step="0.01"
              min="0.1"
              inputMode="decimal"
              required
            />
          </div>

          <div>
            <Label>{tx(locale, "เวลา (ชั่วโมง : นาที : วินาที)", "Duration (hours : minutes : seconds)")}</Label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Input
                name="duration_hours"
                type="number"
                step="1"
                min="0"
                max="99"
                inputMode="numeric"
                defaultValue="0"
                aria-label={tx(locale, "ชั่วโมง", "Hours")}
                placeholder={tx(locale, "ชม.", "hr")}
                required
              />
              <Input
                name="duration_minutes"
                type="number"
                step="1"
                min="0"
                max="59"
                inputMode="numeric"
                defaultValue="0"
                aria-label={tx(locale, "นาที", "Minutes")}
                placeholder={tx(locale, "นาที", "min")}
                required
              />
              <Input
                name="duration_seconds"
                type="number"
                step="1"
                min="0"
                max="59"
                inputMode="numeric"
                defaultValue="0"
                aria-label={tx(locale, "วินาที", "Seconds")}
                placeholder={tx(locale, "วินาที", "sec")}
                required
              />
            </div>
            <p className="mt-1 text-xs text-ink/40">
              {tx(locale, "ตัวอย่าง 1 ชั่วโมง 30 นาที กรอก 01 : 30 : 00", "Example: enter 01 : 30 : 00 for 1 hour 30 minutes")}
            </p>
          </div>

          <div>
            <Label>{tx(locale, "วันที่วิ่ง", "Activity date")}</Label>
            <Input name="activity_date" type="date" defaultValue={today} required />
          </div>

          <div>
            <Label>{tx(locale, "อัปโหลดรูปหลักฐาน (screenshot จากแอปวิ่ง)", "Upload evidence (screenshot from your activity app)")}</Label>
            <input
              name="evidence_file"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              required
              className="block w-full text-sm text-ink/70 file:mr-3 file:rounded-lg file:border-0 file:bg-lane file:px-3 file:py-2 file:text-sm file:font-medium hover:file:bg-lane/70"
            />
            <p className="mt-1 text-xs text-ink/40">
              {tx(locale, "รองรับ PNG, JPG และ WebP — ระบบ OCR จะอ่านระยะจากภาพและเปรียบเทียบกับค่าที่กรอก", "PNG, JPG, and WebP supported. OCR reads the distance and compares it with your entry.")}
            </p>
          </div>

          <SubmissionSubmitButton locale={locale} />
        </Card>
      </form>
    </div>
  );
}
