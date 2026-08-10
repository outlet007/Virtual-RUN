"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button, Card, HeadingIcon, ImageUploadField, Input, Label, Select } from "@/components/ui";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { createEvent } from "@/lib/actions/admin";

export function CreateEventModal({
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
        สร้างงาน
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
            className="max-h-[calc(100vh-1rem)] w-full max-w-3xl overflow-y-auto sm:max-h-[calc(100vh-2rem)]"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-event-title"
          >
            <form action={createEvent}>
              <Card className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 id="create-event-title" className="flex items-center gap-2 font-display text-lg font-bold">
                      <HeadingIcon name="calendarPlus" />
                      สร้างงานใหม่
                    </h3>
                    <p className="mt-1 text-sm text-ink/50">
                      กรอกข้อมูลงานและกำหนดช่วงเวลารับสมัคร
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-ink/40 transition hover:bg-lane/50 hover:text-ink"
                    aria-label="ปิดหน้าต่างสร้างงาน"
                  >
                    <X className="size-5" aria-hidden="true" />
                  </button>
                </div>

                {error && (
                  <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                    {error}
                  </div>
                )}

                <div>
                  <Label>ชื่องาน</Label>
                  <Input name="title" required autoFocus />
                </div>
                <div>
                  <Label>คำนำหน้า BIB</Label>
                  <Input
                    name="bib_prefix"
                    defaultValue="VR"
                    minLength={2}
                    maxLength={8}
                    pattern="[A-Za-z0-9]{2,8}"
                    className="uppercase"
                    required
                  />
                  <p className="mt-1 text-xs text-ink/45">
                    ตัวอักษรอังกฤษหรือตัวเลข 2–8 ตัว
                  </p>
                </div>
                <div>
                  <Label>รายละเอียด</Label>
                  <RichTextEditor name="description" />
                </div>
                <ImageUploadField
                  name="cover_image_file"
                  label="รูปปกงาน (hero banner)"
                  positionXName="cover_position_x"
                  positionYName="cover_position_y"
                  defaultPositionX={50}
                  defaultPositionY={50}
                />
                <ImageUploadField name="poster_image_file" label="รูป poster" />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <Label>ประเภทค่าสมัคร</Label>
                    <Select name="pricing" defaultValue="free">
                      <option value="free">ฟรี</option>
                      <option value="paid">มีค่าสมัคร</option>
                    </Select>
                  </div>
                  <div>
                    <Label>สถานะ</Label>
                    <Select name="status" defaultValue="draft">
                      <option value="draft">ร่าง</option>
                      <option value="open">เปิดรับสมัคร</option>
                      <option value="closed">ปิดรับสมัคร</option>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <Label>วันที่เริ่ม</Label>
                    <Input name="start_date" type="date" required />
                  </div>
                  <div>
                    <Label>วันที่สิ้นสุด</Label>
                    <Input name="end_date" type="date" required />
                  </div>
                </div>
                <Button className="w-full" type="submit" icon="add">
                  สร้างงาน
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
