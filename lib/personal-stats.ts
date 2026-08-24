export type PersonalDistanceSourceRow = {
  activityDate: string;
  activityType: "run" | "walk";
  distanceKm: number;
};

export type PersonalDistanceSeriesPoint = {
  key: string;
  label: string;
  runKm: number;
  walkKm: number;
  totalKm: number;
};

const bangkokDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Bangkok",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function bangkokDateKey(value: Date | string) {
  return bangkokDateFormatter.format(new Date(value));
}

function addUtcDays(date: Date, days: number) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function roundDistance(value: number) {
  return Number(value.toFixed(2));
}

export function buildPersonalDistanceSeries(
  rows: PersonalDistanceSourceRow[],
  now = new Date(),
  days = 30,
): PersonalDistanceSeriesPoint[] {
  const distances = new Map<string, { runKm: number; walkKm: number }>();

  for (const row of rows) {
    const key = bangkokDateKey(row.activityDate);
    const current = distances.get(key) ?? { runKm: 0, walkKm: 0 };
    const distanceKm = Number(row.distanceKm) || 0;
    if (row.activityType === "walk") current.walkKm += distanceKm;
    else current.runKm += distanceKm;
    distances.set(key, current);
  }

  const todayKey = bangkokDateKey(now);
  const today = new Date(`${todayKey}T00:00:00.000Z`);

  return Array.from({ length: days }, (_, index) => {
    const date = addUtcDays(today, index - (days - 1));
    const key = date.toISOString().slice(0, 10);
    const distance = distances.get(key) ?? { runKm: 0, walkKm: 0 };
    const runKm = roundDistance(distance.runKm);
    const walkKm = roundDistance(distance.walkKm);
    return {
      key,
      label: new Intl.DateTimeFormat("th-TH", {
        day: "numeric",
        month: "short",
        timeZone: "UTC",
      }).format(date),
      runKm,
      walkKm,
      totalKm: roundDistance(runKm + walkKm),
    };
  });
}
