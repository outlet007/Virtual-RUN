"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button, Card, HeadingIcon, Input, Label } from "@/components/ui";
import { createLevel } from "@/lib/actions/levels";

export function CreateLevelModal({
  initialOpen = false,
  error,
}: {
  initialOpen?: boolean;
  error?: string;
}) {
  const [open, setOpen] = useState(initialOpen);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <Button type="button" icon="add" onClick={() => setOpen(true)}>
        เพิ่ม Level ใหม่
      </Button>

      {mounted &&
        open &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-2 backdrop-blur-sm sm:p-4"
            onClick={() => setOpen(false)}
            role="presentation"
          >
            <div
              className="max-h-[calc(100vh-1rem)] w-full max-w-2xl overflow-y-auto sm:max-h-[calc(100vh-2rem)]"
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="create-level-title"
            >
              <form action={createLevel}>
                <Card className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 id="create-level-title" className="flex items-center gap-2 font-display text-lg font-bold">
                        <HeadingIcon name="level" />
                        เพิ่ม Level ใหม่
                      </h3>
                      <p className="mt-1 text-sm text-ink/50">
                        กำหนดหมายเลข ชื่อ และ XP ขั้นต่ำสำหรับ Level ใหม่
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-ink/40 transition hover:bg-lane/50 hover:text-ink"
                      aria-label="ปิดหน้าต่างเพิ่ม Level"
                    >
                      <X className="size-5" aria-hidden="true" />
                    </button>
                  </div>

                  {error && (
                    <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                      {error}
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-[120px_minmax(0,1fr)_minmax(180px,0.7fr)]">
                    <div>
                      <Label>Level</Label>
                      <Input
                        name="level_number"
                        type="number"
                        min={1}
                        max={999}
                        required
                        autoFocus
                      />
                    </div>
                    <div>
                      <Label>ชื่อ Level</Label>
                      <Input name="name" maxLength={50} required />
                    </div>
                    <div>
                      <Label>XP ขั้นต่ำเพื่อปลดล็อก</Label>
                      <Input
                        name="min_xp"
                        type="number"
                        min={0}
                        max={1000000000}
                        required
                      />
                    </div>
                  </div>
                  <Button className="w-full" type="submit" icon="add">
                    เพิ่ม Level
                  </Button>
                </Card>
              </form>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
