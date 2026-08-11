"use client";

import { useEffect, useState, type ChangeEvent, type PointerEvent } from "react";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";

function clampPosition(value: number | null | undefined) {
  if (!Number.isFinite(value)) return 50;
  return Math.min(100, Math.max(0, Math.round(value!)));
}

export function ImageUploadField({
  name,
  label,
  defaultImageUrl,
  className,
  positionXName,
  positionYName,
  defaultPositionX,
  defaultPositionY,
  compact = false,
  compactSize = "default",
  previewVariant = "square",
}: {
  name: string;
  label: string;
  defaultImageUrl?: string | null;
  className?: string;
  positionXName?: string;
  positionYName?: string;
  defaultPositionX?: number | null;
  defaultPositionY?: number | null;
  compact?: boolean;
  compactSize?: "default" | "large" | "fill";
  previewVariant?: "square" | "logo";
}) {
  const [preview, setPreview] = useState<string | null>(defaultImageUrl ?? null);
  const [positionX, setPositionX] = useState(() => clampPosition(defaultPositionX));
  const [positionY, setPositionY] = useState(() => clampPosition(defaultPositionY));
  const positionable = Boolean(positionXName && positionYName);

  useEffect(() => {
    return () => {
      if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) setPreview(URL.createObjectURL(file));
  }

  function updatePosition(event: PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    setPositionX(clampPosition(((event.clientX - rect.left) / rect.width) * 100));
    setPositionY(clampPosition(((event.clientY - rect.top) / rect.height) * 100));
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!preview) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    updatePosition(event);
  }

  return (
    <div className={cn("space-y-3", className)}>
      <label
        className={cn("mb-1.5 block text-sm font-medium text-ink/70", compact && "sr-only")}
      >
        {label}
      </label>
      {compact && !positionable ? (
        <label
          className={cn(
            "group relative block shrink-0 cursor-pointer overflow-hidden rounded-xl border border-lane bg-lane/40",
            compactSize === "fill"
              ? "h-full min-h-32 w-full"
              : compactSize === "large"
                ? "h-32 w-32"
                : "h-16 w-16",
          )}
          title={preview ? `เปลี่ยน${label}` : `เพิ่ม${label}`}
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt={label} className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-center text-xs text-ink/40">
              ไม่มีรูป
            </span>
          )}
          <span className="absolute inset-x-0 bottom-0 inline-flex items-center justify-center gap-1 bg-black/65 py-0.5 text-center text-[10px] font-medium text-white opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
            <Upload className="size-3" aria-hidden="true" />
            {preview ? "เปลี่ยนรูป" : "เพิ่มรูป"}
          </span>
          <input
            type="file"
            name={name}
            accept="image/*"
            className="sr-only"
            onChange={handleFileChange}
          />
        </label>
      ) : positionable ? (
        <>
          <div
            className="relative aspect-[3/1] min-h-40 w-full touch-none overflow-hidden rounded-xl border border-lane bg-lane/40"
            onPointerDown={handlePointerDown}
            onPointerMove={(event) => {
              if (event.currentTarget.hasPointerCapture(event.pointerId)) updatePosition(event);
            }}
            onPointerUp={(event) => {
              if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                event.currentTarget.releasePointerCapture(event.pointerId);
              }
            }}
            title={preview ? "ลากบนภาพเพื่อเลือกจุดโฟกัส" : undefined}
          >
            {preview ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview}
                  alt={`ตัวอย่างตำแหน่ง${label}`}
                  className="absolute inset-0 h-full w-full select-none object-cover"
                  style={{ objectPosition: [positionX, positionY].join("% ") + "%" }}
                  draggable={false}
                />
                <span
                  className="pointer-events-none absolute size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-black/35 shadow-md"
                  style={{ left: positionX + "%", top: positionY + "%" }}
                  aria-hidden="true"
                />
              </>
            ) : (
              <div className="flex h-full min-h-40 items-center justify-center text-sm text-ink/40">
                เลือก{label}เพื่อปรับตำแหน่งโฟกัส
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-ink/50">ลากจุดบนภาพ หรือใช้แถบเลื่อนเพื่อกำหนดจุดโฟกัส</p>
            <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-lane bg-transparent px-4 text-sm font-semibold text-ink/70 transition hover:bg-lane/50">
              <Upload className="size-4" aria-hidden="true" />
              เลือกรูป
              <input type="file" name={name} accept="image/*" className="hidden" onChange={handleFileChange} />
            </label>
          </div>
          <input type="hidden" name={positionXName} value={positionX} />
          <input type="hidden" name={positionYName} value={positionY} />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-xs font-medium text-ink/60">
              <span className="flex justify-between gap-2">
                แนวนอน <span className="tnum">{positionX}%</span>
              </span>
              <input type="range" min="0" max="100" value={positionX} onChange={(event) => setPositionX(Number(event.target.value))} className="w-full accent-ink" />
            </label>
            <label className="space-y-1 text-xs font-medium text-ink/60">
              <span className="flex justify-between gap-2">
                แนวตั้ง <span className="tnum">{positionY}%</span>
              </span>
              <input type="range" min="0" max="100" value={positionY} onChange={(event) => setPositionY(Number(event.target.value))} className="w-full accent-ink" />
            </label>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt=""
              className={cn(
                "h-16 shrink-0 rounded-xl border border-lane",
                previewVariant === "logo"
                  ? "w-full max-w-56 bg-white object-contain p-1"
                  : "w-16 object-cover",
              )}
            />
          ) : (
            <div className={cn(
              "flex h-16 shrink-0 items-center justify-center rounded-xl border border-dashed border-lane text-xs text-ink/40",
              previewVariant === "logo" ? "w-full max-w-56" : "w-16",
            )}>
              ไม่มีรูป
            </div>
          )}
          <label className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-lane bg-transparent px-4 text-sm font-semibold text-ink/70 transition hover:bg-lane/50">
            <Upload className="size-4" aria-hidden="true" />
            เพิ่มรูป
            <input type="file" name={name} accept="image/*" className="hidden" onChange={handleFileChange} />
          </label>
        </div>
      )}
    </div>
  );
}
