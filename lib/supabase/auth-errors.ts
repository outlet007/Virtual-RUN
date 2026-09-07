type AuthErrorLike = {
  code?: unknown;
  message?: unknown;
  status?: unknown;
};

export function isInvalidRefreshTokenError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const authError = error as AuthErrorLike;
  if (authError.code === "refresh_token_not_found") return true;

  if (authError.status !== 400 || typeof authError.message !== "string") {
    return false;
  }

  const message = authError.message.toLowerCase();
  return (
    message.includes("invalid refresh token") &&
    (message.includes("not found") || message.includes("already used"))
  );
}

export function isSupabaseAuthCookieName(name: string): boolean {
  return name.startsWith("sb-") && name.includes("-auth-token");
}
