"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button, Card, HeadingIcon } from "@/components/ui";
import { useDialogFocus } from "@/components/use-dialog-focus";
import { tx, type Locale } from "@/lib/i18n/shared";

export function PrivacyPolicyModal({
  locale,
  policyText,
}: {
  locale: Locale;
  policyText: string;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

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
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        className="font-semibold text-primary-dark underline decoration-primary-dark/30 underline-offset-2 transition hover:decoration-primary-dark"
      >
        {tx(locale, "นโยบายความเป็นส่วนตัว", "Privacy policy")}
      </button>

      {mounted &&
        open &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-6"
            onClick={closeModal}
            role="presentation"
          >
            <div
              ref={dialogRef}
              tabIndex={-1}
              className="max-h-[calc(100vh-1.5rem)] w-full max-w-2xl overflow-y-auto sm:max-h-[calc(100vh-3rem)]"
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="privacy-policy-title"
            >
              <Card className="space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <h2
                    id="privacy-policy-title"
                    className="flex items-center gap-2 font-display text-xl font-bold"
                  >
                    <HeadingIcon name="shield" />
                    {tx(locale, "นโยบายความเป็นส่วนตัว", "Privacy policy")}
                  </h2>
                  <button
                    ref={closeRef}
                    type="button"
                    onClick={closeModal}
                    className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-ink/50 transition hover:bg-lane/50 hover:text-ink"
                    aria-label={tx(locale, "ปิดนโยบายความเป็นส่วนตัว", "Close privacy policy")}
                  >
                    <X className="size-5" aria-hidden="true" />
                  </button>
                </div>

                <div className="whitespace-pre-wrap break-words text-sm leading-7 text-ink/75">
                  {policyText}
                </div>

                <div className="flex justify-end border-t border-lane pt-4">
                  <Button type="button" variant="ghost" onClick={closeModal}>
                    {tx(locale, "ปิด", "Close")}
                  </Button>
                </div>
              </Card>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
