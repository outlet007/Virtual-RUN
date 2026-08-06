export const DEFAULT_BIB_PREFIX = "VR";

export function normalizeBibPrefix(value: FormDataEntryValue | null) {
  return String(value ?? DEFAULT_BIB_PREFIX)
    .trim()
    .toUpperCase();
}

export function isValidBibPrefix(value: string) {
  return /^[A-Z0-9]{2,8}$/.test(value);
}
