"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export function Tabs({ tabs }: { tabs: { label: string; content: React.ReactNode }[] }) {
  const [active, setActive] = useState(0);

  return (
    <div>
      <div className="flex flex-wrap gap-1 border-b border-lane" role="tablist">
        {tabs.map((t, i) => (
          <button
            key={t.label}
            type="button"
            role="tab"
            aria-selected={active === i}
            onClick={() => setActive(i)}
            className={cn(
              "border-b-2 px-4 py-2.5 text-sm font-medium transition",
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
