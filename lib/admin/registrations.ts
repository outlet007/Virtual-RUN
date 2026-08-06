import { createAdminClient } from "@/lib/supabase/admin";

export type ShippingAddress = {
  recipient: string;
  phone: string;
  address: string;
  province: string;
  postal_code: string;
} | null;

export type AdminRegistrationRow = {
  id: string;
  bib_number: string | null;
  shipping_address: ShippingAddress;
  status: string;
  registered_at: string;
  users: { name: string | null; email: string | null } | null;
  packages: { id: string; name: string } | null;
  events: { id: string; title: string } | null;
};

export const registrationStatusLabel: Record<string, string> = {
  pending: "รอดำเนินการ",
  confirmed: "ยืนยันแล้ว",
  cancelled: "ยกเลิก",
};

export type RegistrationFilters = {
  q?: string;
  eventId?: string;
  status?: string;
};

function normalizeSearchValue(value: unknown) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase("th-TH")
    .trim();
}

export async function getAdminRegistrations(filters: RegistrationFilters = {}) {
  const db = createAdminClient();
  let query = db
    .from("registrations")
    .select(
      "id, bib_number, shipping_address, status, registered_at, users(name, email), packages(id, name), events(id, title)",
    )
    .order("registered_at", { ascending: false });

  if (filters.eventId) query = query.eq("event_id", filters.eventId);
  if (filters.status && filters.status !== "all") query = query.eq("status", filters.status);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as unknown as AdminRegistrationRow[];
  const searchNeedle = normalizeSearchValue(filters.q);
  if (!searchNeedle) return rows;

  return rows.filter((registration) =>
    [
      registration.users?.name,
      registration.users?.email,
      registration.bib_number,
      registration.events?.title,
      registration.packages?.name,
      registrationStatusLabel[registration.status],
    ].some((value) => normalizeSearchValue(value).includes(searchNeedle)),
  );
}

export async function getRegistrationEventOptions() {
  const db = createAdminClient();
  const { data, error } = await db
    .from("events")
    .select("id, title")
    .order("start_date", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}
