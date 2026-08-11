export const LOCALE_COOKIE = "virtual_run_locale";

export const SUPPORTED_LOCALES = ["th", "en"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "th";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && SUPPORTED_LOCALES.includes(value as Locale);
}

export function pickLocalized(locale: Locale, thai: string, english?: string | null): string;
export function pickLocalized(
  locale: Locale,
  thai: string | null,
  english?: string | null,
): string | null;
export function pickLocalized(
  locale: Locale,
  thai: string | null,
  english?: string | null,
): string | null {
  if (locale === "en" && typeof english === "string" && english.trim()) return english;
  return thai;
}

const ENGLISH_LOWERCASE_WORDS = new Set([
  "a",
  "an",
  "and",
  "as",
  "at",
  "but",
  "by",
  "for",
  "from",
  "in",
  "into",
  "nor",
  "of",
  "on",
  "or",
  "per",
  "the",
  "to",
  "via",
  "with",
  "yet",
]);

export function titleCaseEnglish(value: string) {
  return value.replace(/[A-Za-z]+(?:['\u2019][A-Za-z]+)?/g, (word, offset) => {
    const lower = word.toLowerCase();
    const isFirstWord = !/[A-Za-z]/.test(value.slice(0, offset));
    if (!isFirstWord && ENGLISH_LOWERCASE_WORDS.has(lower)) return lower;
    if (/^[A-Z]{2,}$/.test(word) || /[A-Z].*[A-Z]/.test(word)) return word;
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  });
}

export function tx(locale: Locale, thai: string, english: string) {
  return locale === "en" ? titleCaseEnglish(english) : thai;
}

export function formatLocalizedDate(
  locale: Locale,
  date: string | Date,
  dateStyle: "medium" | "long" = "medium",
) {
  return new Date(date).toLocaleDateString(locale === "en" ? "en-GB" : "th-TH", {
    dateStyle,
    timeZone: "Asia/Bangkok",
  });
}
