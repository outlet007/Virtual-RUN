import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { MyEventCardData, MyEventsPageData, MyEventsTab } from "@/lib/my-events";

type RegistrationRow = {
  id: string;
  bib_number: string | null;
  status: string;
  packages: MyEventCardData["package"];
  events: MyEventCardData["event"];
};

type SubmissionRow = {
  registration_id: string;
  distance_km: number;
};

export async function getMyEventsPage(
  supabase: SupabaseClient,
  userId: string,
  tab: MyEventsTab,
  today: string,
  offset: number,
  limit: number,
): Promise<MyEventsPageData> {
  let query = supabase
    .from("registrations")
    .select(
      "id, bib_number, status, packages(name, name_en, target_distance_km, has_physical_medal), events!inner(id, title, title_en, start_date, end_date)",
      { count: "exact" },
    )
    .eq("user_id", userId);

  query = tab === "past"
    ? query.lt("events.end_date", today)
    : query.gte("events.end_date", today);

  const { data, count, error } = await query
    .order("registered_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  const registrations = (data ?? []) as unknown as RegistrationRow[];
  const registrationIds = registrations.map((registration) => registration.id);
  const approvedByRegistration = new Map<string, number>();

  if (registrationIds.length > 0) {
    const { data: submissionsData, error: submissionsError } = await supabase
      .from("submissions")
      .select("registration_id, distance_km")
      .eq("user_id", userId)
      .eq("status", "approved")
      .in("registration_id", registrationIds);

    if (submissionsError) throw submissionsError;

    for (const submission of (submissionsData ?? []) as SubmissionRow[]) {
      approvedByRegistration.set(
        submission.registration_id,
        (approvedByRegistration.get(submission.registration_id) ?? 0) +
          Number(submission.distance_km),
      );
    }
  }

  return {
    total: count ?? registrations.length,
    items: registrations.map((registration) => ({
      id: registration.id,
      bib_number: registration.bib_number,
      status: registration.status,
      approved_distance_km: approvedByRegistration.get(registration.id) ?? 0,
      package: registration.packages,
      event: registration.events,
    })),
  };
}
