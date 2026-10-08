import Link from "next/link";
import { redirect } from "next/navigation";
import { MyEventsTabs } from "@/components/dashboard/my-events-tabs";
import { Card, HeadingIcon } from "@/components/ui";
import { getBangkokDate } from "@/lib/event-registration";
import { getLocale } from "@/lib/i18n/server";
import { tx } from "@/lib/i18n/shared";
import { getMyEventsPage } from "@/lib/my-events-data";
import { MY_EVENTS_PAGE_SIZE, parseMyEventsTab } from "@/lib/my-events";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function MyEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const [supabase, locale, params] = await Promise.all([
    createClient(),
    getLocale(),
    searchParams,
  ]);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const today = getBangkokDate();
  const [current, past] = await Promise.all([
    getMyEventsPage(supabase, user.id, "current", today, 0, MY_EVENTS_PAGE_SIZE),
    getMyEventsPage(supabase, user.id, "past", today, 0, MY_EVENTS_PAGE_SIZE),
  ]);
  const total = current.total + past.total;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 font-display text-xl font-bold">
          <HeadingIcon name="calendarCheck" />
          {tx(locale, "งานของฉัน", "My events")}
        </h2>
        <p className="mt-1 text-sm text-muted">
          {tx(
            locale,
            "งานที่สมัครไว้ทั้งหมด พร้อมความคืบหน้าสะสมระยะ — กดบันทึกผลวิ่งของงานนั้นๆ ได้เลยในแต่ละรายการ",
            "All joined events with distance progress — submit an activity for a specific event right from its card",
          )}
        </p>
      </div>

      {total === 0 ? (
        <Card className="text-center text-ink/50">
          {tx(locale, "ยังไม่ได้สมัครงาน", "You have not joined an event yet")} —{" "}
          <Link href="/" className="text-primary-dark underline">
            {tx(locale, "ไปดูงานวิ่ง", "Browse events")}
          </Link>
        </Card>
      ) : (
        <MyEventsTabs
          locale={locale}
          initialTab={parseMyEventsTab(params.tab)}
          current={current}
          past={past}
        />
      )}
    </div>
  );
}
