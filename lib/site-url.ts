function validHttpOrigin(value: string | null | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.origin : null;
  } catch {
    return null;
  }
}

export function getSiteOrigin(request: Request) {
  const configured =
    validHttpOrigin(process.env.SITE_URL) ??
    validHttpOrigin(process.env.NEXT_PUBLIC_SITE_URL);
  if (configured) return configured;

  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || request.headers.get("host");
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProto === "https" ? "https" : "http";
  const forwardedOrigin = host ? validHttpOrigin(`${protocol}://${host}`) : null;
  if (forwardedOrigin) return forwardedOrigin;

  return new URL(request.url).origin;
}

export function createSiteUrl(request: Request, path: string) {
  return new URL(path, getSiteOrigin(request));
}
