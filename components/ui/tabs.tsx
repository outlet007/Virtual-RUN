"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type TabItem = {
  id: string;
  label: string;
  content: React.ReactNode;
};

export function Tabs({ tabs, defaultTab }: { tabs: TabItem[]; defaultTab?: string }) {
  const getActiveIndex = () => Math.max(0, tabs.findIndex((tab) => tab.id === defaultTab));
  const [active, setActive] = useState(getActiveIndex);

  useEffect(() => {
    setActive(getActiveIndex());
  }, [defaultTab]);

  function selectTab(index: number) {
    setActive(index);

    const url = new URL(window.location.href);
    url.searchParams.set("tab", tabs[index].id);
    window.history.replaceState({}, "", url);
  }

  return (
    <div>
      <div className="flex max-w-full gap-1 overflow-x-auto border-b border-lane" role="tablist">
        {tabs.map((t, i) => (
          <button
            key={t.label}
            type="button"
            role="tab"
            aria-selected={active === i}
            onClick={() => selectTab(i)}
            className={cn(
              "shrink-0 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition sm:px-4",
              active === i
                ? "border-primary text-primary-dark"
                : "border-transparent text-ink/50 hover:text-ink",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="pt-5" role="tabpanel">
        {tabs[active].content}
      </div>
    </div>
  );
}
