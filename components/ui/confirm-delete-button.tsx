"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CheckCircle2, TriangleAlert } from "lucide-react";
import { Button, type ButtonIconName } from "./index";

export function ConfirmDeleteButton({
  title = "ยืนยันการลบ",
  description,
  triggerLabel = "ลบ",
  confirmLabel = "ยืนยันการลบ",
  formAction,
  className,
  icon = "delete",
  tone = "danger",
}: {
  title?: string;
  description: string;
  triggerLabel?: string;
  confirmLabel?: string;
  formAction?: React.ButtonHTMLAttributes<HTMLButtonElement>["formAction"];
  className?: string;
  icon?: ButtonIconName;
  // danger = ลบ/ย้อน (แดง), confirm = ยืนยันการทำรายการ (เขียว)
  tone?: "danger" | "confirm";
}) {
  const isConfirm = tone === "confirm";
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
        variant={isConfirm ? "primary" : "ghost"}
        icon={icon}
        className={
          className ??
          (isConfirm ? undefined : "border-red-200 text-red-700 hover:bg-red-50")
        }
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
          <div
            className={`w-full max-w-md rounded-2xl border bg-white p-5 shadow-2xl sm:p-6 ${
              isConfirm ? "border-emerald-100" : "border-red-100"
            }`}
          >
            <div className="flex items-start gap-3">
              <span
                className={`grid size-10 shrink-0 place-items-center rounded-full ${
                  isConfirm ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                }`}
              >
                {isConfirm ? (
                  <CheckCircle2 className="size-5" aria-hidden="true" />
                ) : (
                  <TriangleAlert className="size-5" aria-hidden="true" />
                )}
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
                icon={icon}
                formAction={formAction}
                className={
                  isConfirm
                    ? "bg-emerald-600 text-white hover:bg-emerald-700"
                    : "bg-red-600 text-white hover:bg-red-700"
                }
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