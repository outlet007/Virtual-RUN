"use client";

import { useEffect, useId, useRef, useState } from "react";
import { TriangleAlert } from "lucide-react";
import { Button } from "./index";

export function ConfirmDeleteButton({
  title = "ยืนยันการลบ",
  description,
  triggerLabel = "ลบ",
  confirmLabel = "ยืนยันการลบ",
  formAction,
  className,
}: {
  title?: string;
  description: string;
  triggerLabel?: string;
  confirmLabel?: string;
  formAction?: React.ButtonHTMLAttributes<HTMLButtonElement>["formAction"];
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    dialogRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        icon="delete"
        className={className ?? "border-red-200 text-red-700 hover:bg-red-50"}
        onClick={() => setOpen(true)}
      >
        {triggerLabel}
      </Button>

      {open && (
        <div
          ref={dialogRef}
          tabIndex={-1}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm outline-none"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          onClick={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div className="w-full max-w-md rounded-2xl border border-red-100 bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-red-100 text-red-700">
                <TriangleAlert className="size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h3 id={titleId} className="font-display text-lg font-bold text-ink">
                  {title}
                </h3>
                <p id={descriptionId} className="mt-1 text-sm leading-relaxed text-muted">
                  {description}
                </p>
              </div>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="ghost" icon="reject" onClick={() => setOpen(false)}>
                ยกเลิก
              </Button>
              <Button
                type="submit"
                icon="delete"
                formAction={formAction}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                {confirmLabel}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}