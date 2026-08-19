import { Trophy } from "lucide-react";
import { Card } from "@/components/ui";
import type { EventBibLeaderboardRow } from "@/lib/event-bib-leaderboard";
import { tx, type Locale } from "@/lib/i18n/shared";

export function EventBibLeaderboard({
  rows,
  locale,
}: {
  rows: EventBibLeaderboardRow[];
  locale: Locale;
}) {
  return (
    <section aria-labelledby="event-bib-leaderboard-heading" className="pt-3">
      <div className="mb-3">
        <h2
          id="event-bib-leaderboard-heading"
          className="flex items-center gap-2 font-display text-xl font-bold"
        >
          <Trophy className="size-5 text-medal" aria-hidden="true" />
          {tx(locale, "อันดับระยะสะสมสูงสุด", "Top accumulated distance")}
        </h2>
        <p className="mt-1 text-sm text-ink/50">
          {tx(locale, "10 อันดับของงานนี้ จากผลที่อนุมัติแล้ว", "Top 10 for this event, based on approved results")}
        </p>
      </div>

      {rows.length === 0 ? (
        <Card className="text-center text-sm text-ink/50">
          {tx(locale, "ยังไม่มีผลวิ่งที่อนุมัติสำหรับจัดอันดับ", "No approved activity results available for ranking")}
        </Card>
      ) : (
        <Card className="p-0 sm:p-0">
          <ol
            className="divide-y divide-lane"
            aria-label={tx(locale, "10 อันดับระยะสะสมสูงสุดของงานนี้", "Top 10 accumulated distances for this event")}
          >
            {rows.map((row, index) => (
              <li
                key={row.registrationId}
                className="flex min-w-0 items-center gap-3 px-4 py-3"
              >
                <span
                  className={`grid size-8 shrink-0 place-items-center rounded-full font-mono text-sm font-bold ${
                    index < 3 ? "bg-medal-soft text-medal" : "bg-lane text-ink/60"
                  }`}
                  aria-label={`${tx(locale, "อันดับ", "Rank")} ${index + 1}`}
                >
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 truncate font-mono font-semibold tnum">
                  {row.bibNumber ? `BIB ${row.bibNumber}` : tx(locale, "ยังไม่มีเลข BIB", "No BIB number yet")}
                </span>
                <strong className="shrink-0 font-mono text-sm text-[#00954F] tnum">
                  {row.distanceKm.toLocaleString(locale === "en" ? "en-US" : "th-TH", {
                    maximumFractionDigits: 2,
                  })}{" "}
                  {tx(locale, "กม.", "km")}
                </strong>
              </li>
            ))}
          </ol>
        </Card>
      )}
    </section>
  );
}
