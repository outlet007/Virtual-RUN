import { getBangkokDate } from "./event-registration.ts";

export type AdminEventStatusFilter =
  | { kind: "all" }
  | { kind: "stored"; status: string }
  | { kind: "effective-open"; today: string }
  | { kind: "effective-closed"; today: string };

export function getEffectiveEventStatus(
  status: string,
  endDate: string | null,
  today = getBangkokDate(),
): string {
  return status === "open" && Boolean(endDate) && endDate! < today ? "closed" : status;
}

export function getAdminEventStatusFilter(
  status: string,
  today = getBangkokDate(),
): AdminEventStatusFilter {
  if (!status) return { kind: "all" };
  if (status === "open") return { kind: "effective-open", today };
  if (status === "closed") return { kind: "effective-closed", today };
  return { kind: "stored", status };
}
