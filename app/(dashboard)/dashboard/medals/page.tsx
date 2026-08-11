import { redirect } from "next/navigation";
import { Medal as MedalIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { MedalFilterGrid } from "@/components/dashboard/medal-filter-grid";
import { HeadingIcon } from "@/components/ui";
import type { MedalEntry } from "@/components/dashboard/medal-hexagon";
import { isEventRegistrationOpen } from "@/lib/event-registration";
import { getLocale } from "@/lib/i18n/server";
import { pickLocalized } from "@/lib/i18n/shared";
import { tx } from "@/lib/i18n/shared";

export const dynamic = "force-dynamic";

type MedalRow = {
  id: string;
  name: string;
  name_en: string | null;
  tier: string;
  image_url: string | null;
  unlock_rule: { target_km?: number } | null;
  sort_order: number;
};
type RegRow = {
  id: string;
  event_id: string;
  status: string;
};
type EventRow = {
  id: string;
  title: string;
  title_en: string | null;
  status: string;
  end_date: string;
  medals: MedalRow[];
  packages: { id: string }[];
};
type Sub = {
  registration_id: string;
  distance_km: number;
  status: string;
};

export default async function MedalsPage() {
  const [supabase, locale] = await Promise.all([createClient(), getLocale()]);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: eventsRaw }, { data: regsRaw }, { data: subsRaw }, { data: earnedRaw }] =
    await Promise.all([
      supabase
        .from("events")
        .select(
          "id, title, title_en, status, end_date, medals(id, name, name_en, tier, image_url, unlock_rule, sort_order), packages(id)",
        ),
      supabase
        .from("registrations")
        .select("id, event_id, status")
        .eq("user_id", user.id)
        .neq("status", "cancelled"),
      supabase
        .from("submissions")
        .select("registration_id, distance_km, status")
        .eq("user_id", user.id),
      supabase
        .from("user_medals")
        .select("medal_id, unlocked_at")
        .eq("user_id", user.id),
    ]);

  const events = (eventsRaw ?? []) as unknown as EventRow[];
  const regs = (regsRaw ?? []) as RegRow[];
  const subs = (subsRaw ?? []) as Sub[];
  const earnedMap = new Map((earnedRaw ?? []).map((e) => [e.medal_id, e.unlocked_at]));

  const registrationByEvent = new Map<string, RegRow>();
  for (const registration of regs) {
    const current = registrationByEvent.get(registration.event_id);
    if (!current || registration.status === "confirmed") {
      registrationByEvent.set(registration.event_id, registration);
    }
  }

  const approvedByReg = new Map<string, number>();
  for (const s of subs) {
    if (s.status === "approved") {
      approvedByReg.set(
        s.registration_id,
        (approvedByReg.get(s.registration_id) ?? 0) + Number(s.distance_km),
      );
    }
  }

  const entries: MedalEntry[] = events
    .filter(
      (event) =>
        (isEventRegistrationOpen(event) && event.packages.length > 0) ||
        registrationByEvent.has(event.id) ||
        event.medals.some((medal) => earnedMap.has(medal.id)),
    )
    .flatMap((event) => {
      const registration = registrationByEvent.get(event.id);
      const registrationOpen = isEventRegistrationOpen(event);

      return [...event.medals]
        .sort(
          (a, b) =>
            a.sort_order - b.sort_order ||
            Number(a.unlock_rule?.target_km ?? 0) - Number(b.unlock_rule?.target_km ?? 0) ||
            a.name.localeCompare(b.name, "th"),
        )
        .map((m) => ({
          key: `${event.id}-${m.id}`,
          name: pickLocalized(locale, m.name, m.name_en),
          tier: m.tier,
          imageUrl: m.image_url,
          earned: earnedMap.has(m.id),
          unlockedAt: earnedMap.get(m.id) ?? null,
          progressKm: registration ? approvedByReg.get(registration.id) ?? 0 : 0,
          targetKm: m.unlock_rule?.target_km ?? 0,
          eventId: event.id,
          eventTitle: pickLocalized(locale, event.title, event.title_en),
          registrationStatus: registration?.status ?? null,
          registrationOpen,
          registrationHref:
            event.packages.length === 1
              ? `/events/${event.id}/register?package=${event.packages[0].id}`
              : `/events/${event.id}#packages`,
        }));
    });

  const earnedCount = entries.filter((e) => e.earned).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 font-display text-xl font-bold">
            <HeadingIcon name="medal" />
            {tx(locale, "เหรียญรางวัลของฉัน", "My medals")}
          </h2>
          <p className="mt-1 text-sm text-muted">{tx(locale, "เก็บเหรียญให้ครบทุกความสำเร็จในเส้นทางนักวิ่งของคุณ", "Collect medals for every achievement on your running journey")}</p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-lane bg-white px-5 py-3">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-medal-soft text-medal">
            <MedalIcon className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs text-ink/40">{tx(locale, "เหรียญที่ได้รับ", "Medals earned")}</p>
            <p className="font-mono text-lg font-bold tnum">
              {earnedCount} / {entries.length}
            </p>
          </div>
        </div>
      </div>

      {entries.length === 0 ? (
        <p className="text-center text-sm text-ink/40">
          {tx(locale, "ยังไม่มีงานที่เปิดให้สะสมเหรียญดิจิทัลในขณะนี้", "No events currently offer digital medals")}
        </p>
      ) : (
        <MedalFilterGrid entries={entries} locale={locale} />
      )}
    </div>
  );
}
