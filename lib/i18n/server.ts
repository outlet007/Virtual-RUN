import "server-only";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, type Locale } from "@/lib/i18n/shared";

export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  if (isLocale(cookieLocale)) return cookieLocale;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return DEFAULT_LOCALE;

  const { data } = await supabase
    .from("users")
    .select("preferred_language")
    .eq("id", user.id)
    .maybeSingle();
  return isLocale(data?.preferred_language) ? data.preferred_language : DEFAULT_LOCALE;
}
