export const PASSWORD_RECOVERY_COOKIE = "virtual-run-password-recovery";
export const PASSWORD_RECOVERY_MAX_AGE_SECONDS = 15 * 60;
export const MIN_PASSWORD_LENGTH = 6;

export function normalizeRecoveryEmail(value: FormDataEntryValue | null) {
  return String(value ?? "").trim().toLowerCase();
}

export function isValidRecoveryEmail(email: string) {
  return (
    email.length > 0 &&
    email.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  );
}

export function getNewPasswordError(password: string, confirmation: string) {
  if (password.length < MIN_PASSWORD_LENGTH) return "password_too_short";
  if (password !== confirmation) return "password_mismatch";
  return null;
}
