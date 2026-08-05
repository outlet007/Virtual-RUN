import "server-only";

export function toPublicSupabaseUrl(value: string) {
  const publicBase = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!publicBase) return value;

  try {
    const url = new URL(value);
    const publicUrl = new URL(publicBase);
    url.protocol = publicUrl.protocol;
    url.hostname = publicUrl.hostname;
    url.port = publicUrl.port;
    return url.toString();
  } catch {
    return value;
  }
}
