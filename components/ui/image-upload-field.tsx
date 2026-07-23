"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export function ImageUploadField({
  name,
  label,
  defaultImageUrl,
  className,
}: {
  name: string;
  label: string;
  defaultImageUrl?: string | null;
  className?: string;
}) {
  const [preview, setPreview] = useState<string | null>(defaultImageUrl ?? null);

  return (
    <div className={className}>
      <label className="mb-1.5 block text-sm font-medium text-ink/70">{label}</label>
      <div className="flex items-center gap-3">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt=""
            className="h-16 w-16 rounded-xl border border-lane object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-dashed border-lane text-xs text-ink/40">
            ไม่มีรูป
          </div>
        )}
        <label
          className={cn(
            "inline-flex h-11 cursor-pointer items-center justify-center rounded-xl border border-lane bg-transparent px-4 text-sm font-semibold text-ink/70 transition hover:bg-lane/50",
          )}
        >
          + เพิ่มรูป
          <input
            type="file"
            name={name}
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) setPreview(URL.createObjectURL(file));
            }}
          />
        </label>
      </div>
    </div>
  );
}
