"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { HeadingIcon, LinkButton } from "@/components/ui";

export function EditArticleModal({
  articleTitle,
  publishedHref,
  children,
  error,
}: {
  articleTitle: string;
  publishedHref?: string;
  children: ReactNode;
  error?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        router.replace("/admin/articles?view=articles", { scroll: false });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, router]);

  function closeModal() {
    setOpen(false);
    router.replace("/admin/articles?view=articles", { scroll: false });
  }

  return (
    <>
      {mounted &&
        open &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-2 backdrop-blur-sm sm:p-4"
            onClick={closeModal}
            role="presentation"
          >
            <div
              className="flex max-h-[calc(100vh-1rem)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-paper shadow-2xl sm:max-h-[calc(100vh-2rem)]"
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="edit-article-title"
            >
              <div className="flex shrink-0 items-start justify-between gap-3 border-b border-lane bg-paper px-4 py-4 sm:px-6">
                <div className="min-w-0">
                  <h3 id="edit-article-title" className="flex items-center gap-2 font-display text-lg font-bold">
                    <HeadingIcon name="edit" />
                    แก้ไขบทความ
                  </h3>
                  <p className="mt-1 truncate text-sm text-ink/50">{articleTitle}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {publishedHref && (
                    <LinkButton href={publishedHref} variant="ghost" icon="view">
                      ดูหน้าบทความ
                    </LinkButton>
                  )}
                  <button
                    type="button"
                    onClick={closeModal}
                    className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-ink/40 transition hover:bg-lane/50 hover:text-ink"
                    aria-label="ปิดหน้าต่างแก้ไขบทความ"
                  >
                    <X className="size-5" aria-hidden="true" />
                  </button>
                </div>
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