export const MY_EVENTS_PAGE_SIZE = 9;

export type MyEventsTab = "current" | "past";

export type MyEventCardData = {
  id: string;
  bib_number: string | null;
  status: string;
  approved_distance_km: number;
  package: {
    name: string;
    name_en: string | null;
    target_distance_km: number;
    has_physical_medal: boolean;
  } | null;
  event: {
    id: string;
    title: string;
    title_en: string | null;
    start_date: string;
    end_date: string;
  };
};

export type MyEventsPageData = {
  items: MyEventCardData[];
  total: number;
};

export function parseMyEventsTab(value: unknown): MyEventsTab {
  return value === "past" ? "past" : "current";
}

export function getMyEventsBatchSize(viewportWidth: number): number {
  if (viewportWidth >= 1024) return 9;
  if (viewportWidth >= 640) return 6;
  return 4;
}

export function clampMyEventsPageSize(value: unknown): number {
  const parsed = typeof value === "string" ? Number.parseInt(value, 10) : Number(value);
  if (!Number.isFinite(parsed)) return MY_EVENTS_PAGE_SIZE;
  return Math.min(MY_EVENTS_PAGE_SIZE, Math.max(1, Math.trunc(parsed)));
}

export function clampMyEventsOffset(value: unknown): number {
  const parsed = typeof value === "string" ? Number.parseInt(value, 10) : Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.trunc(parsed));
}
