"use client";

import { useEffect, useState } from "react";
import { ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui";

export function EvidenceLightbox({ src, alt }: { src: string; alt: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
      <Button
        type="button"
        icon="view"
        variant="ink"
        className="mt-3 h-10 gap-2 px-4"
        onClick={() => setOpen(true)}
      >

        ดูหลักฐาน
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-2 backdrop-blur-sm sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="ภาพหลักฐานผลวิ่ง"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex max-h-[calc(100vh-1rem)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:max-h-[calc(100vh-2rem)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-lane px-4 py-3 sm:px-5">
              <h3 className="font-display text-lg font-bold">หลักฐานผลวิ่ง</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-ink/50 transition hover:bg-lane/60 hover:text-ink"
                aria-label="ปิดภาพหลักฐาน"
                autoFocus
              >
                <X className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>

            <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-ink/95 p-3 sm:p-5">
              {/* Signed URLs are temporary and already authorized by the server. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={alt}
                className="max-h-[75vh] max-w-full rounded-lg object-contain"
              />
            </div>

            <div className="flex justify-end border-t border-lane px-4 py-3 sm:px-5">
              <a
                href={src}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-lane px-4 text-sm font-semibold transition hover:bg-lane/50"
              >
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                เปิดภาพในแท็บใหม่
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
