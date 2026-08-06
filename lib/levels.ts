export type LevelDefinition = {
  level_number: number;
  name: string;
  min_xp: number;
};

const FALLBACK_LEVELS: LevelDefinition[] = [
  { level_number: 1, name: "ผู้เริ่มต้น", min_xp: 0 },
  { level_number: 2, name: "นักวิ่งฝึกหัด", min_xp: 1000 },
];

export function calculateLevelProgress(points: number, definitions: LevelDefinition[]) {
  const totalXp = Math.max(0, Math.floor(Number(points) || 0));
  const levels = (definitions.length > 0 ? definitions : FALLBACK_LEVELS)
    .filter(
      (level) =>
        Number.isInteger(level.level_number) &&
        level.level_number > 0 &&
        Number.isInteger(level.min_xp) &&
        level.min_xp >= 0,
    )
    .sort((a, b) => a.min_xp - b.min_xp || a.level_number - b.level_number);
  const usableLevels = levels.length > 0 ? levels : FALLBACK_LEVELS;
  const currentIndex = Math.max(
    0,
    usableLevels.findLastIndex((level) => level.min_xp <= totalXp),
  );
  const current = usableLevels[currentIndex];
  const next = usableLevels[currentIndex + 1] ?? null;
  const currentXp = totalXp - current.min_xp;
  const xpPerLevel = next ? next.min_xp - current.min_xp : Math.max(currentXp, 1);

  return {
    level: current.level_number,
    levelName: current.name,
    currentXp,
    xpPerLevel,
    totalXp,
    nextLevelXp: next?.min_xp ?? null,
    isMaxLevel: next === null,
  };
}
