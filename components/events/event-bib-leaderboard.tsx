import { Trophy } from "lucide-react";
import { Card } from "@/components/ui";
import type { EventBibLeaderboardRow } from "@/lib/event-bib-leaderboard";

export function EventBibLeaderboard({
  rows,
}: {
  rows: EventBibLeaderboardRow[];
}) {
  return (
    <section aria-labelledby="event-bib-leaderboard-heading" className="pt-3">
      <div className="mb-3">
        <h2
          id="event-bib-leaderboard-heading"
          className="flex items-center gap-2 font-display text-xl font-bold"
        >
          <Trophy className="size-5 text-medal" aria-hidden="true" />
          อันดับระยะสะสมสูงสุด
        </h2>
        <p className="mt-1 text-sm text-ink/50">10 อันดับของงานนี้ จากผลที่อนุมัติแล้ว</p>
      </div>

      {rows.length === 0 ? (
        <Card className="text-center text-sm text-ink/50">
          ยังไม่มีผลวิ่งที่อนุมัติสำหรับจัดอันดับ
        </Card>
      ) : (
        <Card className="p-0 sm:p-0">
          <ol className="divide-y divide-lane" aria-label="10 อันดับระยะสะสมสูงสุดของงานนี้">
            {rows.map((row, index) => (
              <li
                key={row.registrationId}
                className="flex min-w-0 items-center gap-3 px-4 py-3"
              >
                <span
                  className={`grid size-8 shrink-0 place-items-center rounded-full font-mono text-sm font-bold ${
                    index < 3 ? "bg-medal-soft text-medal" : "bg-lane text-ink/60"
                  }`}
                  aria-label={`อันดับ ${index + 1}`}
                >
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 truncate font-mono font-semibold tnum">
                  {row.bibNumber ? `BIB ${row.bibNumber}` : "ยังไม่มีเลข BIB"}
                </span>
                <strong className="shrink-0 font-mono text-sm text-primary-dark tnum">
                  {row.distanceKm.toLocaleString("th-TH", {
                    maximumFractionDigits: 2,
                  })}{" "}
                  กม.
                </strong>
              </li>
            ))}
          </ol>
        </Card>
      )}
    </section>
  );
}
