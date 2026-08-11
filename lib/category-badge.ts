export const DEFAULT_CATEGORY_BADGE_BACKGROUND_COLOR = "#FEC81D";
export const DEFAULT_CATEGORY_BADGE_TEXT_COLOR = "#1C1C1C";

const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

export function normalizeCategoryBadgeColor(value: unknown) {
  const color = String(value ?? "").trim();
  return HEX_COLOR_PATTERN.test(color) ? color.toUpperCase() : null;
}
