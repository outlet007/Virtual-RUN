"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button, HeadingIcon } from "@/components/ui";
import { useDialogFocus } from "@/components/use-dialog-focus";

export function CreateArticleModal({
  children,
  initialOpen = false,
  error,
}: {
  children: ReactNode;
  initialOpen?: boolean;
  error?: string;
}) {
  const [open, setOpen] = useState(initialOpen);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setMounted(true), []);

  function closeModal() {
    setOpen(false);
  }

  useDialogFocus({
    open,
    dialogRef,
    initialFocusRef: closeRef,
    returnFocusRef: triggerRef,
    onClose: closeModal,
  });

  return (
    <>
      <Button ref={triggerRef} type="button" icon="add" onClick={() => setOpen(true)}>
        สร้างบทความใหม่
      </Button>

      {mounted &&
        open &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-2 backdrop-blur-sm sm:p-4"
            onClick={closeModal}
            role="presentation"
          >
            <div
              ref={dialogRef}
              tabIndex={-1}
              className="flex max-h-[calc(100vh-1rem)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-paper shadow-2xl sm:max-h-[calc(100vh-2rem)]"
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="create-article-title"
            >
              <div className="flex shrink-0 items-start justify-between gap-3 border-b border-lane bg-paper px-4 py-4 sm:px-6">
                <div>
                  <h3 id="create-article-title" className="flex items-center gap-2 font-display text-lg font-bold">
                    <HeadingIcon name="article" />
                    สร้างบทความใหม่
                  </h3>
                  <p className="mt-1 text-sm text-ink/50">
                    สร้างข่าวประชาสัมพันธ์ เกร็ดความรู้ หรือเนื้อหาอื่นสำหรับหน้าเว็บไซต์
                  </p>
                </div>
                <button
                  ref={closeRef}
                  type="button"
                  onClick={closeModal}
                  className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-ink/40 transition hover:bg-lane/50 hover:text-ink"
                  aria-label="ปิดหน้าต่างสร้างบทความ"
                >
                  <X className="size-5" aria-hidden="true" />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto bg-lane/20 p-3 sm:p-6">
                {error && (
                  <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                    {error}
                  </div>
                )}
                {children}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
