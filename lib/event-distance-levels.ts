export type EventDistanceLevel = {
  id: string;
  name: string;
  name_en?: string | null;
  target_distance_km: number;
  sort_order: number;
  digital_medal_id?: string | null;
  reward_description?: string | null;
  reward_description_en?: string | null;
  bonus_points?: number;
};

export type EventDistanceLevelProgress = {
  approvedDistanceKm: number;
  currentLevel: EventDistanceLevel | null;
  nextLevel: EventDistanceLevel | null;
  finalLevel: EventDistanceLevel | null;
  remainingDistanceKm: number;
  completed: boolean;
};

export function sortEventDistanceLevels<T extends EventDistanceLevel>(levels: T[]): T[] {
  return [...levels].sort(
    (a, b) =>
      a.sort_order - b.sort_order ||
      Number(a.target_distance_km) - Number(b.target_distance_km) ||
      a.name.localeCompare(b.name, "th"),
  );
}

export function getEventDistanceLevelProgress(
  levels: EventDistanceLevel[],
  approvedDistanceKm: number,
): EventDistanceLevelProgress {
  const approvedDistance = Math.max(0, Number(approvedDistanceKm) || 0);
  const ordered = sortEventDistanceLevels(levels).filter(
    (level) => Number(level.target_distance_km) > 0,
  );
  const currentLevel =
    ordered.findLast((level) => approvedDistance >= Number(level.target_distance_km)) ?? null;
  const nextLevel =
    ordered.find((level) => approvedDistance < Number(level.target_distance_km)) ?? null;
  const finalLevel = ordered.at(-1) ?? null;

  return {
    approvedDistanceKm: approvedDistance,
    currentLevel,
    nextLevel,
    finalLevel,
    remainingDistanceKm: nextLevel
      ? Math.max(0, Number(nextLevel.target_distance_km) - approvedDistance)
      : 0,
    completed: finalLevel !== null && approvedDistance >= Number(finalLevel.target_distance_km),
  };
}
