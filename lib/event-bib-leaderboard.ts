export type EventBibLeaderboardSourceRow = {
  registrationId: string;
  bibNumber: string | null;
  distanceKm: number;
};

export type EventBibLeaderboardRow = {
  registrationId: string;
  bibNumber: string | null;
  distanceKm: number;
};

export function buildEventBibLeaderboard(
  rows: EventBibLeaderboardSourceRow[],
  limit = 10,
): EventBibLeaderboardRow[] {
  const registrations = new Map<
    string,
    { bibNumber: string | null; distanceKm: number }
  >();

  for (const row of rows) {
    const registration = registrations.get(row.registrationId) ?? {
      bibNumber: row.bibNumber,
      distanceKm: 0,
    };
    registration.bibNumber = registration.bibNumber ?? row.bibNumber;
    registration.distanceKm += Number(row.distanceKm) || 0;
    registrations.set(row.registrationId, registration);
  }

  return [...registrations.entries()]
    .map(([registrationId, registration]) => ({
      registrationId,
      bibNumber: registration.bibNumber,
      distanceKm: Number(registration.distanceKm.toFixed(2)),
    }))
    .sort(
      (left, right) =>
        right.distanceKm - left.distanceKm ||
        (left.bibNumber ?? "").localeCompare(right.bibNumber ?? "", "th", {
          numeric: true,
        }),
    )
    .slice(0, Math.max(0, limit));
}
