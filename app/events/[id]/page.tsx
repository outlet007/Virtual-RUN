import Link from "next/link";
import { notFound } from "next/navigation";
import { Medal, CalendarDays, ChevronLeft, Road } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, Badge, LinkButton } from "@/components/ui";
import { formatBaht, formatDate, stripHtml } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function EventDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select(
      "id, title, description, cover_image, cover_position_x, cover_position_y, poster_image, pricing, start_date, end_date, packages(id, name, target_distance_km, price, has_physical_medal, digital_medal:medals!packages_digital_medal_id_fkey(id, name), physical_medal:physical_medals!packages_physical_medal_id_fkey(id, name))",
    )
    .eq("id", id)
    .single();

  if (!event) notFound();
  const packages = (event.packages ?? []).map((packageRow) => ({
    ...packageRow,
    digital_medal: Array.isArray(packageRow.digital_medal)
      ? packageRow.digital_medal[0] ?? null
      : packageRow.digital_medal,
    physical_medal: Array.isArray(packageRow.physical_medal)
      ? packageRow.physical_medal[0] ?? null
      : packageRow.physical_medal,
  }));

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Banner header ของงานนี้ — full-bleed เหมือน hero, ใช้ cover_image ของ event เอง */}
      {/* -mt-8 หักล้าง padding-top ของ <main> (py-8) ให้ banner ชิดกับ header เหมือนหน้าแรก */}
      <div className="relative left-1/2 right-1/2 -mx-[50vw] -mt-8 min-h-[420px] w-screen overflow-hidden bg-ink sm:min-h-[480px]">
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
        <div className="relative mx-auto flex min-h-[420px] max-w-[1500px] flex-col justify-end px-0 py-6 sm:min-h-[480px] sm:py-8">
          <div className="max-w-3xl">
            <Badge
              className={
                event.pricing === "free"
                  ? "w-fit text-sm bg-[rgb(10,164,57)] text-white shadow-sm"
                  : "w-fit text-sm bg-[rgb(255,93,0)] text-white shadow-sm"
              }
            >
              {event.pricing === "free" ? "ฟรี" : "มีค่าสมัคร"}
            </Badge>
            <h1 className="mt-3 font-display text-3xl font-bold leading-tight text-white drop-shadow-md sm:text-4xl">
              {event.title}
            </h1>
            <p className="mt-3 inline-flex items-center gap-1.5 font-mono text-sm font-medium text-white/90 drop-shadow-sm tnum">
              <CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" />{" "}
              {formatDate(event.start_date)} – {formatDate(event.end_date)}
            </p>
            {event.description && (
              <p className="mt-2 line-clamp-2 max-w-2xl text-sm leading-relaxed text-white/85 drop-shadow-sm sm:text-base">
                {stripHtml(event.description)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* สไตล์ปุ่มเดียวกับ "ดูรายละเอียด →" ที่ใช้ในการ์ดรายการงาน — ตามที่ขอย้ายมาแทนตำแหน่งคำโปรยเดิม */}
      <Link
        href="/"
        className="inline-flex w-fit items-center gap-1 rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-ink transition hover:bg-primary-dark"
      >
        <ChevronLeft className="h-4 w-4" /> งานทั้งหมด
      </Link>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[7fr_3fr]">
        {/* ซ้าย: รายละเอียดงาน + รูป poster (จัดการรูปนี้ได้จากหน้า admin แก้ไขงาน) */}
        <div className="space-y-4">
          <h2 className="font-display text-xl font-bold">รายละเอียดงาน</h2>
          {event.description && (
            <div
              className="prose prose-sm max-w-none text-muted prose-headings:font-display prose-headings:text-ink prose-img:rounded-xl"
              dangerouslySetInnerHTML={{ __html: event.description }}
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
          <h2 className="font-display text-xl font-bold">เลือกแพ็กเกจ</h2>
          {packages.map((p) => (
            <Card
              key={p.id}
              className="flex flex-col gap-3 sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-display font-bold text-charcoal">{p.name}</span>
                  <Badge
                    className={
                      event.pricing === "free" || Number(p.price) === 0
                        ? "bg-[rgb(10,164,57)] text-white"
                        : "bg-[rgb(255,93,0)] text-white"
                    }
                  >
                    {event.pricing === "free" || Number(p.price) === 0
                      ? "ฟรี"
                      : "มีค่าสมัคร"}
                  </Badge>
                </div>
                {(p.digital_medal || p.has_physical_medal) && (
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {p.digital_medal && (
                      <Badge
                        className="max-w-full min-w-0 gap-1 bg-sky-100 text-sky-700"
                        title={`เหรียญดิจิทัล: ${p.digital_medal.name}`}
                      >
                        <Medal className="h-3 w-3 shrink-0" />
                        <span className="truncate">เหรียญดิจิทัล: {p.digital_medal.name}</span>
                      </Badge>
                    )}
                    {p.has_physical_medal && (
                      <Badge
                        className="max-w-full min-w-0 gap-1 bg-orange-100 text-orange-700"
                        title={`เหรียญจริง${p.physical_medal ? `: ${p.physical_medal.name}` : ""}`}
                      >
                        <Medal className="h-3 w-3 shrink-0" />
                        <span className="truncate">
                          เหรียญจริง{p.physical_medal ? `: ${p.physical_medal.name}` : ""}
                        </span>
                      </Badge>
                    )}
                  </div>
                )}
                <div className="mt-1 flex items-center gap-2 font-mono text-sm text-ink/50">
                  <span className="inline-flex items-center gap-1 tnum">
                    <Road className="h-3.5 w-3.5" /> {p.target_distance_km} km
                  </span>
                  {event.pricing !== "free" && Number(p.price) > 0 && (
                    <>
                      <span className="text-ink/25">·</span>
                      {formatBaht(Number(p.price))}
                    </>
                  )}
                </div>
              </div>
              {user ? (
                <LinkButton
                  href={`/events/${event.id}/register?package=${p.id}`}
                  className="w-full shrink-0 whitespace-nowrap sm:w-auto sm:px-3"
                  icon="userPlus">
                  สมัคร
                </LinkButton>
              ) : (
                <LinkButton
                  href={`/login?next=/events/${event.id}`}
                  variant="ghost"
                  className="w-full shrink-0 whitespace-nowrap sm:w-auto sm:px-3"
                  icon="login">
                  เข้าสู่ระบบเพื่อสมัคร
                </LinkButton>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
