export const SHIPMENT_STATUSES = ["pending", "packed", "shipped", "delivered"] as const;
export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number];
export type ShipmentStatusFilter = ShipmentStatus | "all";

export type ShipmentCandidate = {
  id: string;
  approvedDistanceKm: number;
  targetDistanceKm: number;
  shipmentStatus: ShipmentStatus;
};

export function isShipmentEligible(candidate: ShipmentCandidate) {
  return candidate.targetDistanceKm > 0 && candidate.approvedDistanceKm >= candidate.targetDistanceKm;
}

export function matchesShipmentStatus(
  status: ShipmentStatus,
  filter: ShipmentStatusFilter,
) {
  if (filter === "all") return true;
  if (filter === "pending") return status === "pending" || status === "packed";
  return status === filter;
}

const SHIPMENT_STATUS_ORDER: Record<ShipmentStatus, number> = {
  pending: 0,
  packed: 1,
  shipped: 2,
  delivered: 3,
};

export function canTransitionShipmentStatus(from: ShipmentStatus, to: ShipmentStatus) {
  return SHIPMENT_STATUS_ORDER[to] >= SHIPMENT_STATUS_ORDER[from];
}

export type RegistrationTimestampRow = { registeredAt: string };
export type RegistrationSeriesPoint = { key: string; label: string; registrations: number };

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

function addUtcMonths(date: Date, months: number) {
  const result = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
  return result;
}

export function buildRegistrationSeries(
  rows: RegistrationTimestampRow[],
  period: "daily" | "monthly",
  now = new Date(),
): RegistrationSeriesPoint[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const dateKey = bangkokDateKey(row.registeredAt);
    const key = period === "daily" ? dateKey : dateKey.slice(0, 7);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  if (period === "daily") {
    const todayKey = bangkokDateKey(now);
    const today = new Date(`${todayKey}T00:00:00.000Z`);
    return Array.from({ length: 30 }, (_, index) => {
      const date = addUtcDays(today, index - 29);
      const key = date.toISOString().slice(0, 10);
      return {
        key,
        label: new Intl.DateTimeFormat("th-TH", {
          day: "numeric",
          month: "short",
          timeZone: "UTC",
        }).format(date),
        registrations: counts.get(key) ?? 0,
      };
    });
  }

  const monthKey = bangkokDateKey(now).slice(0, 7);
  const currentMonth = new Date(`${monthKey}-01T00:00:00.000Z`);
  return Array.from({ length: 12 }, (_, index) => {
    const date = addUtcMonths(currentMonth, index - 11);
    const key = date.toISOString().slice(0, 7);
    return {
      key,
      label: new Intl.DateTimeFormat("th-TH", {
        month: "short",
        year: "2-digit",
        timeZone: "UTC",
      }).format(date),
      registrations: counts.get(key) ?? 0,
    };
  });
}

export type LeaderboardSourceRow = {
  eventId: string;
  eventTitle: string;
  userId: string;
  userName: string;
  distanceKm: number;
};

export type EventLeaderboard = {
  eventId: string;
  eventTitle: string;
  runners: Array<{ userId: string; userName: string; distanceKm: number }>;
};

export function buildEventLeaderboards(rows: LeaderboardSourceRow[]): EventLeaderboard[] {
  const events = new Map<
    string,
    { title: string; runners: Map<string, { name: string; distanceKm: number }> }
  >();

  for (const row of rows) {
    const event = events.get(row.eventId) ?? {
      title: row.eventTitle,
      runners: new Map<string, { name: string; distanceKm: number }>(),
    };
    const runner = event.runners.get(row.userId) ?? { name: row.userName, distanceKm: 0 };
    runner.distanceKm += Number(row.distanceKm) || 0;
    event.runners.set(row.userId, runner);
    events.set(row.eventId, event);
  }

  return [...events.entries()]
    .map(([eventId, event]) => ({
      eventId,
      eventTitle: event.title,
      runners: [...event.runners.entries()]
        .map(([userId, runner]) => ({
          userId,
          userName: runner.name,
          distanceKm: Number(runner.distanceKm.toFixed(2)),
        }))
        .sort((left, right) =>
          right.distanceKm - left.distanceKm || left.userName.localeCompare(right.userName, "th"),
        )
        .slice(0, 10),
    }))
    .sort((left, right) => left.eventTitle.localeCompare(right.eventTitle, "th"));
}
