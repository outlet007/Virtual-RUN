const BANGKOK_TIME_ZONE = "Asia/Bangkok";

export type EventRegistrationAvailability = {
  status: string | null;
  end_date: string | null;
};

export function getBangkokDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BANGKOK_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";

  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function isEventRegistrationOpen(
  event: EventRegistrationAvailability,
  today = getBangkokDate(),
): boolean {
  return event.status === "open" && Boolean(event.end_date) && event.end_date! >= today;
}
