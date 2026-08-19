import { Card, HeadingIcon } from "@/components/ui";
import type { EventLeaderboard } from "@/lib/admin/day8";

export function EventLeaderboardCard({ leaderboard }: { leaderboard?: EventLeaderboard }) {
  if (!leaderboard || leaderboard.runners.length === 0) {
    return (
      <Card className="text-center text-ink/50">
        ยังไม่มีผลวิ่งที่อนุมัติสำหรับจัดอันดับ
      </Card>
    );
  }

  return (
    <Card>
      <h4 className="flex items-center gap-2 font-display font-bold">
        <HeadingIcon name="calendar" className="size-4" />
        {leaderboard.eventTitle}
      </h4>
      <ol className="mt-3 divide-y divide-lane" aria-label="10 อันดับระยะสะสมสูงสุด">
        {leaderboard.runners.map((runner, index) => (
          <li
            key={runner.userId}
            className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
          >
            <span
              className={`grid size-8 shrink-0 place-items-center rounded-full font-mono text-sm font-bold ${
                index < 3 ? "bg-medal-soft text-medal" : "bg-lane text-ink/60"
              }`}
              aria-label={`อันดับ ${index + 1}`}
            >
              {index + 1}
            </span>
            <span className="min-w-0 flex-1 truncate font-medium">{runner.userName}</span>
            <strong className="shrink-0 font-mono text-[#00954F] tnum">
              {runner.distanceKm.toLocaleString("th-TH", { maximumFractionDigits: 2 })} กม.
            </strong>
          </li>
        ))}
      </ol>
    </Card>
  );
}
