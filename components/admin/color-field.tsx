"use client";

import { Label, Input } from "@/components/ui";

export function ColorField({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          defaultValue={defaultValue}
          className="h-11 w-11 shrink-0 cursor-pointer rounded-lg border border-lane p-1"
          onChange={(e) => {
            const sibling = e.currentTarget.nextElementSibling as HTMLInputElement | null;
            if (sibling) sibling.value = e.currentTarget.value;
          }}
        />
        <Input
          name={name}
          defaultValue={defaultValue}
          pattern="^#[0-9A-Fa-f]{6}$"
          required
          className="font-mono"
          onChange={(e) => {
            const sibling = e.currentTarget.previousElementSibling as HTMLInputElement | null;
            if (sibling && /^#[0-9A-Fa-f]{6}$/.test(e.currentTarget.value)) {
              sibling.value = e.currentTarget.value;
            }
          }}
        />
      </div>
    </div>
  );
}
