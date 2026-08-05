"use client";

import { useState } from "react";
import { ListFilter, Medal } from "lucide-react";
import { cn } from "@/lib/utils";
import { MedalHexagon, type MedalEntry } from "./medal-hexagon";

const tierLabel: Record<string, string> = {
  bronze: "บรอนซ์",
  silver: "เงิน",
  gold: "ทอง",
  legendary: "ตำนาน",
};

const tierOrder = ["bronze", "silver", "gold", "legendary"];

export function MedalFilterGrid({ entries }: { entries: MedalEntry[] }) {
  const presentTiers = new Set(entries.map((entry) => entry.tier));
  const tiersPresent = [
    ...tierOrder.filter((tier) => presentTiers.has(tier)),
    ...Array.from(presentTiers).filter((tier) => !tierOrder.includes(tier)).sort(),
  ];
  const [filter, setFilter] = useState<string>("all");

  const filtered = filter === "all" ? entries : entries.filter((e) => e.tier === filter);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition",
            filter === "all" ? "bg-ink text-paper" : "bg-lane/60 text-ink/60 hover:bg-lane",
          )}
        >
          <ListFilter className="size-4" aria-hidden="true" />
          ทั้งหมด
        </button>
        {tiersPresent.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setFilter(t)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition",
              filter === t ? "bg-ink text-paper" : "bg-lane/60 text-ink/60 hover:bg-lane",
            )}
          >
            <Medal className="size-4" aria-hidden="true" />
            {tierLabel[t] ?? t}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-sm text-ink/40">ไม่มีเหรียญในหมวดนี้</p>
      ) : (
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
          {filtered.map((entry) => (
            <MedalHexagon key={entry.key} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}
