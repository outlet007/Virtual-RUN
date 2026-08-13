const ACTIVITY_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isValidActivityDate(value: string): boolean {
  if (!ACTIVITY_DATE_PATTERN.test(value)) return false;

  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}