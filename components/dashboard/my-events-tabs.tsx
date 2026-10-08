"use client";

import Link from "next/link";
import { Flag } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Badge, Button, Card, LinkButton, TrackProgress } from "@/components/ui";
import { pickLocalized, tx, type Locale } from "@/lib/i18n/shared";
import { isEventSubmissionOpen } from "@/lib/event-registration";
import {
  getMyEventsBatchSize,
  type MyEventCardData,
  type MyEventsPageData,
  type MyEventsTab,
} from "@/lib/my-events";
import { formatKmExact } from "@/lib/utils";

type TabState = MyEventsPageData & {
  visible: number;
  loading: boolean;
  error: boolean;
};

type Props = {
  locale: Locale;
  initialTab: MyEventsTab;
  current: MyEventsPageData;
  past: MyEventsPageData;
};

function EventCard({ item, locale }: { item: MyEventCardData; locale: Locale }) {
  const done = item.approved_distance_km;
  const target = item.package?.target_distance_km ?? 1;
  const finished = done >= target;
  const submissionOpen = isEventSubmissionOpen(item.event.end_date);

  return (
    <Card className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Link href={`/events/${item.event.id}`} className="min-w-0 hover:underline">
          <p className="text-sm text-ink/50">
            {pickLocalized(locale, item.event.title, item.event.title_en)}
          </p>
          <p className="font-display text-lg font-bold">
            {item.package ? pickLocalized(locale, item.package.name, item.package.name_en) : ""}
          </p>
        </Link>
        <div className="text-right">
          {item.bib_number && (
            <p className="font-mono text-sm text-muted tnum">BIB {item.bib_number}</p>
          )}
          {item.status === "pending" ? (
            <Link href={`/dashboard/pay/${item.id}`}>
              <Badge className="bg-medal-soft text-medal hover:underline">
                {tx(locale, "รอชำระเงิน", "Awaiting payment")} →
              </Badge>
            </Link>
          ) : (
            <Badge className={finished ? "bg-[#12b76a] text-white" : "bg-lane text-muted"}>
              {finished ? (
                <span className="inline-flex items-center gap-1">
                  <Flag className="h-3 w-3" aria-hidden="true" />
                  {tx(locale, "ครบเป้า", "Goal reached")}
                </span>
              ) : (
                tx(locale, "กำลังสะสม", "In progress")
              )}
            </Badge>
          )}
        </div>
      </div>
      <div>
        <div className="mb-1 flex justify-between font-mono text-sm tnum">
          <span className="font-bold text-[#00954f]">{formatKmExact(done)} km</span>
          <span className="text-ink/40">/ {target} km</span>
        </div>
        <TrackProgress current={done} target={target} />
      </div>
      {item.status === "confirmed" && submissionOpen && (
        <div className="mt-auto space-y-2">
          {finished && (
            <div className="rounded-xl bg-green-50 px-4 py-3 text-center text-sm font-medium text-green-700">
              {tx(
                locale,
                "คุณทำระยะครบตามเป้าหมายแล้ว สามารถบันทึกผลเพิ่มเพื่อการจัดอันดับได้จนกว่างานจะสิ้นสุด",
                "You have reached your distance goal. You can keep submitting activities for leaderboard ranking until the event ends.",
              )}
            </div>
          )}
          <LinkButton
            href={`/dashboard/submit/${item.id}`}
            icon="upload"
            className={finished ? "w-full bg-green-700 text-white hover:bg-green-800" : "w-full"}
          >
            {finished
              ? tx(locale, "บันทึกผลเพิ่มเพื่อการจัดอันดับ", "Submit more for ranking")
              : tx(locale, "บันทึกผลวิ่งงานนี้", "Submit activity for this event")}
          </LinkButton>
        </div>
      )}
      {item.status === "confirmed" && !submissionOpen && (
        <div className="mt-auto rounded-xl bg-lane px-4 py-3 text-center text-sm font-semibold text-muted">
          {tx(locale, "ปิดรับผลวิ่งแล้ว", "Activity submission closed")}
        </div>
      )}
    </Card>
  );
}

export function MyEventsTabs({ locale, initialTab, current, past }: Props) {
  const initialVisible = 4;
  const [activeTab, setActiveTab] = useState<MyEventsTab>(initialTab);
  const [batchSize, setBatchSize] = useState(initialVisible);
  const [tabs, setTabs] = useState<Record<MyEventsTab, TabState>>({
    current: { ...current, visible: initialVisible, loading: false, error: false },
    past: { ...past, visible: initialVisible, loading: false, error: false },
  });
  const tabRefs = useRef<Record<MyEventsTab, HTMLButtonElement | null>>({
    current: null,
    past: null,
  });

  useEffect(() => {
    function updateBatchSize() {
      const nextSize = getMyEventsBatchSize(window.innerWidth);
      setBatchSize(nextSize);
      setTabs((previous) => ({
        current: { ...previous.current, visible: Math.max(previous.current.visible, nextSize) },
        past: { ...previous.past, visible: Math.max(previous.past.visible, nextSize) },
      }));
    }

    updateBatchSize();
    window.addEventListener("resize", updateBatchSize);
    return () => window.removeEventListener("resize", updateBatchSize);
  }, []);

  function selectTab(tab: MyEventsTab) {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    window.history.replaceState({}, "", url);
  }

  function handleTabKeyDown(event: React.KeyboardEvent, tab: MyEventsTab) {
    const otherTab: MyEventsTab = tab === "current" ? "past" : "current";
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      selectTab(otherTab);
      tabRefs.current[otherTab]?.focus();
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      const nextTab: MyEventsTab = event.key === "Home" ? "current" : "past";
      selectTab(nextTab);
      tabRefs.current[nextTab]?.focus();
    }
  }

  async function showMore() {
    const state = tabs[activeTab];
    const nextVisible = Math.min(state.total, state.visible + batchSize);

    if (state.items.length >= nextVisible) {
      setTabs((previous) => ({
        ...previous,
        [activeTab]: { ...previous[activeTab], visible: nextVisible, error: false },
      }));
      return;
    }

    setTabs((previous) => ({
      ...previous,
      [activeTab]: { ...previous[activeTab], loading: true, error: false },
    }));

    try {
      const params = new URLSearchParams({
        tab: activeTab,
        offset: String(state.items.length),
        limit: String(batchSize),
      });
      const response = await fetch(`/api/dashboard/events?${params.toString()}`);
      if (!response.ok) throw new Error(`Request failed with ${response.status}`);
      const page = (await response.json()) as MyEventsPageData;

      setTabs((previous) => {
        const existing = previous[activeTab];
        const knownIds = new Set(existing.items.map((item) => item.id));
        const newItems = page.items.filter((item) => !knownIds.has(item.id));
        return {
          ...previous,
          [activeTab]: {
            ...existing,
            items: [...existing.items, ...newItems],
            total: page.total,
            visible: Math.min(page.total, nextVisible),
            loading: false,
            error: false,
          },
        };
      });
    } catch (error) {
      console.error("Unable to load more events", error);
      setTabs((previous) => ({
        ...previous,
        [activeTab]: { ...previous[activeTab], loading: false, error: true },
      }));
    }
  }

  const tabItems: Array<{ id: MyEventsTab; label: string }> = [
    { id: "current", label: tx(locale, "งานวิ่งปัจจุบัน", "Current events") },
    { id: "past", label: tx(locale, "งานวิ่งที่ผ่านมา", "Past events") },
  ];
  const activeState = tabs[activeTab];
  const visibleItems = activeState.items.slice(0, activeState.visible);

  return (
    <div>
      <div className="flex max-w-full gap-1 overflow-x-auto border-b border-lane" role="tablist">
        {tabItems.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              ref={(element) => { tabRefs.current[tab.id] = element; }}
              id={`my-events-tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`my-events-panel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => selectTab(tab.id)}
              onKeyDown={(event) => handleTabKeyDown(event, tab.id)}
              className={`shrink-0 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition sm:px-4 ${
                isActive
                  ? "border-primary text-primary-dark"
                  : "border-transparent text-ink/50 hover:text-ink"
              }`}
            >
              {tab.label}
              <span className="ml-2 rounded-full bg-lane px-2 py-0.5 text-xs tnum">
                {tabs[tab.id].total}
              </span>
            </button>
          );
        })}
      </div>

      <div
        id={`my-events-panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`my-events-tab-${activeTab}`}
        className="pt-5"
      >
        {visibleItems.length === 0 ? (
          <Card className="text-center text-ink/50">
            {activeTab === "current"
              ? tx(locale, "ไม่มีงานวิ่งปัจจุบัน", "No current events")
              : tx(locale, "ยังไม่มีงานวิ่งที่ผ่านมา", "No past events")}
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleItems.map((item) => (
              <EventCard key={item.id} item={item} locale={locale} />
            ))}
          </div>
        )}

        {activeState.error && (
          <p role="alert" className="mt-4 text-center text-sm text-red-700">
            {tx(locale, "โหลดรายการเพิ่มเติมไม่สำเร็จ กรุณาลองอีกครั้ง", "Could not load more events. Please try again.")}
          </p>
        )}

        {activeState.visible < activeState.total && (
          <div className="mt-5 flex justify-center">
            <Button type="button" variant="ghost" onClick={showMore} disabled={activeState.loading}>
              {activeState.loading
                ? tx(locale, "กำลังโหลด...", "Loading...")
                : tx(locale, "แสดงเพิ่มเติม", "Show more")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
