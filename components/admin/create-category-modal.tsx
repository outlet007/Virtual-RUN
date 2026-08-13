"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { ColorField } from "@/components/admin/color-field";
import { Button, Card, HeadingIcon, Input, Label } from "@/components/ui";
import { useDialogFocus } from "@/components/use-dialog-focus";
import { createContentCategory } from "@/lib/actions/content";
import {
  DEFAULT_CATEGORY_BADGE_BACKGROUND_COLOR,
  DEFAULT_CATEGORY_BADGE_TEXT_COLOR,
} from "@/lib/category-badge";

export function CreateCategoryModal({
  initialOpen = false,
  error,
}: {
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
        เพิ่มหมวดหมู่
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
              className="max-h-[calc(100vh-1rem)] w-full max-w-3xl overflow-y-auto sm:max-h-[calc(100vh-2rem)]"
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="create-category-title"
            >
              <form action={createContentCategory}>
                <Card className="space-y-4 shadow-2xl">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 id="create-category-title" className="flex items-center gap-2 font-display text-lg font-bold">
                        <HeadingIcon name="package" />
                        เพิ่มหมวดหมู่
                      </h3>
                      <p className="mt-1 text-sm text-ink/50">
                        เพิ่มหมวดหมู่สำหรับข่าว เกร็ดความรู้ และเนื้อหาประเภทอื่น
                      </p>
                    </div>
                    <button
                      ref={closeRef}
                      type="button"
                      onClick={closeModal}
                      className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-ink/40 transition hover:bg-lane/50 hover:text-ink"
                      aria-label="ปิดหน้าต่างเพิ่มหมวดหมู่"
                    >
                      <X className="size-5" aria-hidden="true" />
                    </button>
                  </div>

                  {error && (
                    <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                      {error}
                    </div>
                  )}

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label>ชื่อหมวดหมู่ (ไทย)</Label>
                      <Input name="name" required autoFocus />
                    </div>
                    <div>
                      <Label>Category Name (English)</Label>
                      <Input name="name_en" />
                    </div>
                    <div>
                      <Label>Slug</Label>
                      <Input name="slug" placeholder="เว้นว่างเพื่อสร้างอัตโนมัติ" />
                    </div>
                    <div>
                      <Label>ลำดับ</Label>
                      <Input name="sort_order" type="number" min={0} defaultValue={0} />
                    </div>
                    <ColorField
                      name="badge_background_color"
                      label="สีพื้น Badge"
                      defaultValue={DEFAULT_CATEGORY_BADGE_BACKGROUND_COLOR}
                    />
                    <ColorField
                      name="badge_text_color"
                      label="สีตัวอักษร Badge"
                      defaultValue={DEFAULT_CATEGORY_BADGE_TEXT_COLOR}
                    />
                  </div>

                  <label className="inline-flex min-h-11 items-center gap-2 text-sm">
                    <input type="checkbox" name="is_active" defaultChecked /> เปิดใช้
                  </label>

                  <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <Button type="button" variant="ghost" onClick={closeModal}>
                      ยกเลิก
                    </Button>
                    <Button type="submit" icon="add">
                      เพิ่มหมวดหมู่
                    </Button>
                  </div>
                </Card>
              </form>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
