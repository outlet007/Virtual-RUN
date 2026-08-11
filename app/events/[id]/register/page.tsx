import { notFound, redirect } from "next/navigation";
import { Medal } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, Button, HeadingIcon, Input, Label, Badge } from "@/components/ui";
import { registerForEvent } from "@/lib/actions/registration";
import { formatBaht } from "@/lib/utils";
import { isEventRegistrationOpen } from "@/lib/event-registration";
import { getLocale } from "@/lib/i18n/server";
import { pickLocalized, tx } from "@/lib/i18n/shared";

export const dynamic = "force-dynamic";

export default async function RegisterPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ package?: string }>;
}) {
  const { id } = await params;
  const { package: packageId } = await searchParams;
  const [supabase, locale] = await Promise.all([createClient(), getLocale()]);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/events/${id}`);

  if (!packageId) notFound();
  const { data: pkg } = await supabase
    .from("packages")
    .select("id, event_id, name, name_en, target_distance_km, price, has_physical_medal, events(title, title_en, status, end_date)")
    .eq("id", packageId)
    .single();

  if (!pkg || pkg.event_id !== id) notFound();
  // relation อาจกลับมาเป็น object หรือ array แล้วแต่กรณี
  const ev = pkg.events as unknown as
    | { title: string; title_en: string | null; status: string | null; end_date: string | null }
    | { title: string; title_en: string | null; status: string | null; end_date: string | null }[]
    | null;
  const eventData = Array.isArray(ev) ? ev[0] ?? null : ev;
  if (!eventData) notFound();
  if (!isEventRegistrationOpen(eventData)) {
    redirect(`/events/${id}?error=${encodeURIComponent(tx(locale, "งานนี้สิ้นสุดแล้วและไม่เปิดรับสมัคร", "This event has ended and registration is closed"))}`);
  }
  const eventTitle = pickLocalized(locale, eventData.title, eventData.title_en);
  const packageName = pickLocalized(locale, pkg.name, pkg.name_en);
  const isFree = Number(pkg.price) === 0;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="flex items-center gap-2 font-display text-2xl font-bold">
        <HeadingIcon name="calendarCheck" />
        {tx(locale, "ยืนยันการสมัคร", "Confirm registration")}
      </h1>

      <Card className="space-y-1 bg-ink text-paper">
        <p className="text-sm text-paper/60">{eventTitle}</p>
        <div className="flex items-center gap-2">
          <span className="font-display text-xl font-bold">{packageName}</span>
          {pkg.has_physical_medal && (
            <Badge className="gap-1 bg-medal/20 text-medal">
              <Medal className="h-3 w-3" /> {tx(locale, "เหรียญจริง", "Physical medal")}
            </Badge>
          )}
        </div>
        <div className="font-mono text-sm text-primary tnum">
          {pkg.target_distance_km} km ·{" "}
          {isFree ? tx(locale, "ฟรี", "Free") : formatBaht(Number(pkg.price))}
        </div>
      </Card>

      <form action={registerForEvent} className="space-y-4">
        <input type="hidden" name="package_id" value={pkg.id} />

        {pkg.has_physical_medal && (
          <Card className="space-y-3">
            <p className="text-sm font-semibold">
              {tx(locale, "ที่อยู่สำหรับจัดส่งเหรียญ", "Medal shipping address")}
            </p>
            <div>
              <Label>{tx(locale, "ชื่อผู้รับ", "Recipient name")}</Label>
              <Input name="recipient" required />
            </div>
            <div>
              <Label>{tx(locale, "เบอร์โทร", "Phone")}</Label>
              <Input name="phone" required />
            </div>
            <div>
              <Label>{tx(locale, "ที่อยู่", "Address")}</Label>
              <Input name="address" required />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label>{tx(locale, "จังหวัด", "Province")}</Label>
                <Input name="province" required />
              </div>
              <div>
                <Label>{tx(locale, "รหัสไปรษณีย์", "Postal code")}</Label>
                <Input name="postal_code" inputMode="numeric" required />
              </div>
            </div>
          </Card>
        )}

        {!isFree && (
          <div className="rounded-xl bg-medal-soft px-4 py-3 text-sm text-medal">
            {tx(locale, "งานนี้มีค่าสมัคร — หลังยืนยันจะไปยังหน้าชำระเงิน PromptPay", "This is a paid event. After confirmation, you will continue to PromptPay payment.")}
          </div>
        )}

        <Button className="w-full" type="submit" icon="userPlus">
          {isFree ? tx(locale, "ยืนยันสมัคร (รับ BIB)", "Confirm registration (receive BIB)") : tx(locale, "สมัคร (รอชำระเงิน)", "Register (awaiting payment)")}
        </Button>
      </form>
    </div>
  );
}
