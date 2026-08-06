"use client";

import { useState } from "react";
import { Label } from "@/components/ui";

export function OpacityField({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue: number;
}) {
  const [value, setValue] = useState(defaultValue);

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <Label className="mb-0">{label}</Label>
        <output className="font-mono text-sm text-ink/50 tnum">{value}%</output>
      </div>
      <input
        type="range"
        name={name}
        min="0"
        max="100"
        step="1"
        value={value}
        onChange={(event) => setValue(Number(event.target.value))}
        className="mt-3 h-2 w-full cursor-pointer accent-ink"
      />
      <div className="mt-1 flex justify-between font-mono text-xs text-ink/40 tnum">
        <span>0%</span>
        <span>100%</span>
      </div>
    </div>
  );
}
