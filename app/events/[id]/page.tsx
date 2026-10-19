import Link from "next/link";
import { notFound } from "next/navigation";
import { Medal, CalendarDays, ChevronLeft, ChevronRight, Road } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, Badge, HeadingIcon, LinkButton } from "@/components/ui";
import { EventBibLeaderboard } from "@/components/events/event-bib-leaderboard";
import { buildEventBibLeaderboard } from "@/lib/event-bib-leaderboard";
import { formatBaht, formatDate, stripHtml } from "@/lib/utils";
import { isEventRegistrationOpen } from "@/lib/event-registration";
import { getLocale } from "@/lib/i18n/server";
import { pickLocalized, tx } from "@/lib/i18n/shared";
import { sortEventDistanceLevels, type EventDistanceLevel } from "@/lib/event-distance-levels";
import {
  eventAudienceLabel,
  getEventAudienceDomains,
  getEventAudienceEligibility,
  parseEventAudience,
} from "@/lib/event-audience";

export const dynamic = "force-dynamic";

type LeaderboardSubmissionRow = {
  registration_id: string;
  distance_km: number;
  registrations:
    | { bib_number: string | null }
    | Array<{ bib_number: string | null }>
    | null;
};

export default async function EventDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const [supabase, locale] = await Promise.all([createClient(), getLocale()]);
  const db = createAdminClient();

  const [{ data: event }, { data: leaderboardRows, error: leaderboardError }] =
    await Promise.all([
      supabase
        .from("events")
        .select(
          "id, title, title_en, description, description_en, cover_image, cover_position_x, cover_position_y, poster_image, pricing, event_mode, audience, start_date, end_date, status, packages(id, name, name_en, target_distance_km, price, has_physical_medal, digital_medal:medals!packages_digital_medal_id_fkey(id, name, name_en), physical_medal:physical_medals!packages_physical_medal_id_fkey(id, name, name_en), sort_order), event_distance_levels(id, name, name_en, target_distance_km, sort_order, reward_description, reward_description_en, bonus_points)",
        )
        .eq("id", id)
        .single(),
      db
        .from("submissions")
        .select("registration_id, distance_km, registrations!inner(event_id, bib_number)")
        .eq("status", "approved")
        .eq("registrations.event_id", id),
    ]);

  if (!event) notFound();
  const eventTitle = pickLocalized(locale, event.title, event.title_en);
  const eventDescription = pickLocalized(locale, event.description, event.description_en);
  if (leaderboardError) throw new Error(leaderboardError.message);
  const registrationOpen = isEventRegistrationOpen(event);
  const packages = (event.packages ?? [])
    .map((packageRow) => ({
      ...packageRow,
      digital_medal: Array.isArray(packageRow.digital_medal)
        ? packageRow.digital_medal[0] ?? null
        : packageRow.digital_medal,
      physical_medal: Array.isArray(packageRow.physical_medal)
        ? packageRow.physical_medal[0] ?? null
        : packageRow.physical_medal,
    }))
    .sort((a, b) => a.sort_order - b.sort_order);
  const distanceLevels = sortEventDistanceLevels(
    (event.event_distance_levels ?? []) as EventDistanceLevel[],
  );
  // งานระดับระยะสมัครผ่าน package ภายในรายการแรก และต้องมีระดับอย่างน้อย 1 ระดับ
  // (register_for_event คืน distance_levels_required เมื่อยังไม่มีระดับ)
  const isDistanceLevels = event.event_mode === "distance_levels";
  const levelRegistrationPackage =
    isDistanceLevels && distanceLevels.length > 0 ? packages[0] ?? null : null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: myRegsRaw } = user
    ? await supabase
        .from("registrations")
        .select("id, package_id, status")
        .eq("user_id", user.id)
        .eq("event_id", id)
        .neq("status", "cancelled")
    : { data: null };
  const myRegByPackageId = new Map(
    ((myRegsRaw ?? []) as { id: string; package_id: string; status: string }[]).map((r) => [
      r.package_id,
      r,
    ]),
  );
  const myEventRegistration = ((myRegsRaw ?? []) as {
    id: string;
    package_id: string;
    status: string;
  }[])[0] ?? null;

  // ตรวจกลุ่มผู้สมัครเพื่อซ่อนปุ่มเท่านั้น register_for_event ตรวจซ้ำจากบัญชี Google ใน auth.identities
  const audience = parseEventAudience(event.audience);
  const audienceEligibility = getEventAudienceEligibility(user, audience);
  const userMatchesAudience = audienceEligibility === "eligible";
  const audienceDomains = getEventAudienceDomains(audience);
  const audienceNotice =
    audienceEligibility === "google_required"
      ? tx(
          locale,
          `กรุณาออกจากระบบ แล้วเข้าสู่ระบบด้วย Google ของมหาวิทยาลัย (${audienceDomains.join(" หรือ ")}) เพื่อสมัครงานนี้`,
          `Please sign out and sign in with your university Google account (${audienceDomains.join(" or ")}) to register.`,
        )
      : tx(
          locale,
          `งานนี้เปิดรับเฉพาะ${eventAudienceLabel[audience].th} (${audienceDomains.join(" หรือ ")}) เท่านั้น`,
          `This event is only for ${eventAudienceLabel[audience].en.toLowerCase()} (${audienceDomains.join(" or ")}).`,
        );

  const renderRegisterAction = (
    packageId: string,
    myReg: { id: string; status: string } | null | undefined,
    fullWidth = false,
    priceSuffix = "",
  ) => {
    const buttonClass = fullWidth
      ? "w-full justify-center"
      : "w-full shrink-0 whitespace-nowrap sm:w-auto sm:px-3";
    return (
      <>
        {user && myReg ? (
          myReg.status === "pending" && fullWidth ? (
            <LinkButton href={`/dashboard/pay/${myReg.id}`} className={buttonClass}>
              {tx(locale, "รอชำระเงิน", "Awaiting payment")}
              <ChevronRight className="size-4 shrink-0" aria-hidden="true" />
            </LinkButton>
          ) : myReg.status === "pending" ? (
            <Link href={`/dashboard/pay/${myReg.id}`} className="shrink-0">
              <Badge className="bg-medal-soft text-medal hover:underline">
                {tx(locale, "รอชำระเงิน", "Awaiting payment")} →
              </Badge>
            </Link>
          ) : (
            <LinkButton
              href="/dashboard/events"
              className={`${buttonClass} bg-[#12b76a] text-white hover:bg-[#0f9d5c]`}>
              {tx(locale, "สมัครแล้ว", "Registered")}
              <ChevronRight className="size-4 shrink-0" aria-hidden="true" />
            </LinkButton>
          )
        ) : (
          registrationOpen &&
          (user && !userMatchesAudience ? (
            <p
              className={`${fullWidth ? "w-full" : "sm:max-w-56"} rounded-xl bg-medal-soft px-3 py-2 text-sm text-medal`}
            >
              {audienceNotice}
            </p>
          ) : user ? (
            <LinkButton
              href={`/events/${event.id}/register?package=${packageId}`}
              className={buttonClass}
              icon="userPlus">
              {tx(locale, "สมัคร", "Register")}
              {priceSuffix}
            </LinkButton>
          ) : (
            <LinkButton
              href={`/login?next=/events/${event.id}`}
              variant="ghost"
              className={buttonClass}
              icon="login">
              {tx(locale, "เข้าสู่ระบบเพื่อสมัคร", "Sign in to register")}
            </LinkButton>
          ))
        )}
      </>
    );
  };

  const leaderboard = buildEventBibLeaderboard(
    ((leaderboardRows ?? []) as unknown as LeaderboardSubmissionRow[]).map((row) => {
      const registration = Array.isArray(row.registrations)
        ? row.registrations[0] ?? null
        : row.registrations;
      return {
        registrationId: row.registration_id,
        bibNumber: registration?.bib_number ?? null,
        distanceKm: Number(row.distance_km),
      };
    }),
  );

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Banner header ของงานนี้ — full-bleed เหมือน hero, ใช้ cover_image ของ event เอง */}
      {/* -mt-8 หักล้าง padding-top ของ <main> (py-8) ให้ banner ชิดกับ header เหมือนหน้าแรก */}
      <div className="relative left-1/2 right-1/2 -mx-[50vw] -mt-5 min-h-[420px] w-screen overflow-hidden bg-ink sm:-mt-8 sm:min-h-[480px]">
        {event.cover_image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.cover_image}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            style={{
              objectPosition: [event.cover_position_x, event.cover_position_y].join("% ") + "%",
            }}
          />
        )}
        {/* Fixed black overlays keep contrast stable when the admin changes theme colors. */}
        <div className="absolute inset-0 bg-black/25" aria-hidden="true" />
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-black/15"
          aria-hidden="true"
        />
        <div className="relative mx-auto flex min-h-[420px] max-w-[1500px] flex-col justify-end px-3 py-6 sm:min-h-[480px] sm:px-4 sm:py-8">
          <div className="max-w-3xl">
            <Badge
              className={
                event.pricing === "free"
                  ? "w-fit text-sm bg-[rgb(10,164,57)] text-white shadow-sm"
                  : "w-fit text-sm bg-[rgb(255,93,0)] text-white shadow-sm"
              }
            >
              {event.pricing === "free" ? tx(locale, "ฟรี", "Free") : tx(locale, "มีค่าสมัคร", "Paid")}
            </Badge>
            {audience !== "all" && (
              <Badge className="ml-2 w-fit bg-white text-sm text-ink shadow-sm">
                {tx(locale, "เฉพาะ", "For ")}
                {pickLocalized(locale, eventAudienceLabel[audience].th, eventAudienceLabel[audience].en)}
              </Badge>
            )}
            <h1 className="mt-3 flex items-center gap-3 font-display text-3xl font-bold leading-tight text-white drop-shadow-md sm:text-4xl">
              <HeadingIcon name="calendar" className="size-7 text-primary sm:size-8" />
              {eventTitle}
            </h1>
            <p className="mt-3 inline-flex items-center gap-1.5 font-mono text-sm font-medium text-white/90 drop-shadow-sm tnum">
              <CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" />{" "}
              {formatDate(event.start_date)} – {formatDate(event.end_date)}
            </p>
            {eventDescription && (
              <p className="mt-2 line-clamp-2 max-w-2xl text-sm leading-relaxed text-white/85 drop-shadow-sm sm:text-base">
                {stripHtml(eventDescription)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* สไตล์ปุ่มเดียวกับ "ดูรายละเอียด →" ที่ใช้ในการ์ดรายการงาน — ตามที่ขอย้ายมาแทนตำแหน่งคำโปรยเดิม */}
      <Link
        href="/"
        className="inline-flex w-fit items-center gap-1 rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-ink transition hover:bg-primary-hover"
      >
        <ChevronLeft className="h-4 w-4" /> {tx(locale, "งานทั้งหมด", "All events")}
      </Link>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[7fr_3fr]">
        {/* ซ้าย: รายละเอียดงาน + รูป poster (จัดการรูปนี้ได้จากหน้า admin แก้ไขงาน) */}
        <div className="space-y-4">
          <h2 className="flex items-center gap-2 font-display text-xl font-bold">
            <HeadingIcon name="clipboard" />
            {tx(locale, "รายละเอียดงาน", "Event details")}
          </h2>
          {eventDescription && (
            <div
              className="prose prose-sm max-w-none text-muted prose-headings:font-display prose-headings:text-ink prose-img:rounded-xl"
              dangerouslySetInnerHTML={{ __html: eventDescription }}
            />
          )}
          {event.poster_image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={event.poster_image}
              alt=""
              className="w-full rounded-2xl border border-lane object-cover"
            />
          )}
        </div>

        {/* ขวา: เลือกแพ็กเกจ */}
        <div id="packages" className="scroll-mt-24 space-y-3">
          {event.event_mode === "distance_levels" && (
            <Card className="space-y-3 border-sky-200 bg-sky-50/60">
              <div>
                <h2 className="font-display text-xl font-bold">
                  {tx(locale, "ระดับระยะสะสม", "Cumulative distance levels")}
                </h2>
                <p className="mt-1 text-sm text-ink/55">
                  {tx(
                    locale,
                    "สมัครงานครั้งเดียวและสะสมระยะผ่านแต่ละระดับตามลำดับ",
                    "Register once and accumulate approved distance through each level.",
                  )}
                </p>
              </div>
              <ol className="space-y-2">
                {distanceLevels.map((level, index) => (
                  <li key={level.id} className="rounded-xl border border-sky-100 bg-white px-3 py-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold">
                        {index + 1}. {pickLocalized(locale, level.name, level.name_en)}
                      </span>
                      <Badge className="shrink-0 bg-sky-100 text-sky-700">
                        {level.target_distance_km} km
                      </Badge>
                    </div>
                    {pickLocalized(
                      locale,
                      level.reward_description ?? null,
                      level.reward_description_en ?? null,
                    ) && (
                      <p className="mt-1 text-xs text-ink/50">
                        <span className="font-bold text-[#ff4a00]">
                          {tx(locale, "วิ่งสะสมครบรับ :", "Complete to receive:")}
                        </span>{" "}
                        {pickLocalized(
                          locale,
                          level.reward_description ?? null,
                          level.reward_description_en ?? null,
                        )}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            </Card>
          )}
          {isDistanceLevels ? (
            levelRegistrationPackage ? (
              renderRegisterAction(
                levelRegistrationPackage.id,
                myEventRegistration,
                true,
                event.pricing !== "free" && Number(levelRegistrationPackage.price) > 0
                  ? ` · ${formatBaht(Number(levelRegistrationPackage.price))}`
                  : "",
              )
            ) : (
              <Card className="text-sm text-ink/55">
                {tx(locale, "ยังไม่เปิดรับสมัครงานนี้", "Registration is not open for this event yet.")}
              </Card>
            )
          ) : (
            <>
            <h2 className="flex items-center gap-2 font-display text-xl font-bold">
              <HeadingIcon name="package" />
              {tx(locale, "เลือกแพ็กเกจ", "Choose a package")}
            </h2>
            {packages.map((p) => {
              const myReg = myRegByPackageId.get(p.id);
              return (
                <Card
                  key={p.id}
                  className="flex flex-col gap-3 sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display font-bold text-charcoal">{pickLocalized(locale, p.name, p.name_en)}</span>
                    <Badge
                      className={
                        event.pricing === "free" || Number(p.price) === 0
                          ? "bg-[rgb(10,164,57)] text-white"
                          : "bg-[rgb(255,93,0)] text-white"
                      }
                    >
                      {event.pricing === "free" || Number(p.price) === 0
                        ? tx(locale, "ฟรี", "Free")
                        : tx(locale, "มีค่าสมัคร", "Paid")}
                    </Badge>
                  </div>
                  {(p.digital_medal || p.has_physical_medal) && (
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      {p.digital_medal && (
                        <Badge
                          className="max-w-full min-w-0 gap-1 bg-sky-100 text-sky-700"
                          title={tx(locale, "เหรียญดิจิทัล", "Digital medal") + ": " + pickLocalized(locale, p.digital_medal.name, p.digital_medal.name_en)}
                        >
                          <Medal className="h-3 w-3 shrink-0" />
                          <span className="truncate">{tx(locale, "เหรียญดิจิทัล", "Digital medal")}: {pickLocalized(locale, p.digital_medal.name, p.digital_medal.name_en)}</span>
                        </Badge>
                      )}
                      {p.has_physical_medal && (
                        <Badge
                          className="max-w-full min-w-0 gap-1 bg-orange-100 text-orange-700"
                          title={tx(locale, "เหรียญจริง", "Physical medal") + (p.physical_medal ? ": " + pickLocalized(locale, p.physical_medal.name, p.physical_medal.name_en) : "")}
                        >
                          <Medal className="h-3 w-3 shrink-0" />
                          <span className="truncate">
                            {tx(locale, "เหรียญจริง", "Physical medal")}{p.physical_medal ? ": " + pickLocalized(locale, p.physical_medal.name, p.physical_medal.name_en) : ""}
                          </span>
                        </Badge>
                      )}
                    </div>
                  )}
                  <div className="mt-1 flex items-center gap-2 font-mono text-sm text-ink/50">
                    <span className="inline-flex items-center gap-1 tnum">
                      <Road className="h-3.5 w-3.5" />{" "}
                      {`${p.target_distance_km} km`}
                    </span>
                    {event.pricing !== "free" && Number(p.price) > 0 && (
                      <>
                        <span className="text-ink/25">·</span>
                        {formatBaht(Number(p.price))}
                      </>
                    )}
                  </div>
                </div>
                {renderRegisterAction(p.id, myReg)}
              </Card>
              );
            })}
            </>
          )}
          <EventBibLeaderboard rows={leaderboard} locale={locale} />
        </div>
      </div>
    </div>
  );
}
