"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button, Card, HeadingIcon, Input, Label, Select, ImageUploadField } from "@/components/ui";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { updateEvent } from "@/lib/actions/admin";

type EventForModal = {
  id: string;
  title: string;
  title_en: string | null;
  bib_prefix: string;
  description: string | null;
  description_en: string | null;
  cover_image: string | null;
  cover_position_x: number;
  cover_position_y: number;
  poster_image: string | null;
  pricing: string;
  status: string;
  start_date: string;
  end_date: string;
};

export function EditEventModal({ event }: { event: EventForModal }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <Button variant="ghost" type="button" icon="edit" onClick={() => setOpen(true)}>
        แก้ไขงาน
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-2 backdrop-blur-sm sm:p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-h-[calc(100vh-1rem)] w-full max-w-3xl overflow-y-auto sm:max-h-[calc(100vh-2rem)]"
            onClick={(e) => e.stopPropagation()}
          >
            <form action={updateEvent}>
              <input type="hidden" name="id" value={event.id} />
              <input type="hidden" name="existing_cover_image" value={event.cover_image ?? ""} />
              <input type="hidden" name="existing_poster_image" value={event.poster_image ?? ""} />
              <Card className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-2 font-display text-lg font-bold">
                    <HeadingIcon name="edit" />
                    แก้ไขงาน
                  </h3>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="leading-none text-ink/40 hover:text-ink"
                    aria-label="ปิด"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div><Label>ชื่องาน (ไทย)</Label><Input name="title" defaultValue={event.title} required /></div>
                  <div><Label>Event Name (English)</Label><Input name="title_en" defaultValue={event.title_en ?? ""} /></div>
                </div>
                <div>
                  <Label>คำนำหน้า BIB</Label>
                  <Input
                    name="bib_prefix"
                    defaultValue={event.bib_prefix}
                    minLength={2}
                    maxLength={8}
                    pattern="[A-Za-z0-9]{2,8}"
                    className="uppercase"
                    required
                  />
                  <p className="mt-1 text-xs text-ink/45">ตัวอักษรอังกฤษหรือตัวเลข 2–8 ตัว</p>
                </div>
                <div><Label>รายละเอียด (ไทย)</Label><RichTextEditor name="description" defaultValue={event.description} /></div>
                <div><Label>Description (English)</Label><RichTextEditor name="description_en" defaultValue={event.description_en} /></div>
                <div className="space-y-4">
                  <ImageUploadField
                    name="cover_image_file"
                    label="รูปปกงาน (hero banner)"
                    defaultImageUrl={event.cover_image}
                    positionXName="cover_position_x"
                    positionYName="cover_position_y"
                    defaultPositionX={event.cover_position_x}
                    defaultPositionY={event.cover_position_y}
                  />
                  <ImageUploadField
                    name="poster_image_file"
                    label="รูป poster"
                    defaultImageUrl={event.poster_image}
                  />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <Label>ประเภทค่าสมัคร</Label>
                    <Select name="pricing" defaultValue={event.pricing}>
                      <option value="free">ฟรี</option>
                      <option value="paid">มีค่าสมัคร</option>
                    </Select>
                  </div>
                  <div>
                    <Label>สถานะ</Label>
                    <Select name="status" defaultValue={event.status}>
                      <option value="draft">ร่าง</option>
                      <option value="open">เปิดรับสมัคร</option>
                      <option value="closed">ปิดรับสมัคร</option>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <Label>วันที่เริ่ม</Label>
                    <Input name="start_date" type="date" defaultValue={event.start_date} required />
                  </div>
                  <div>
                    <Label>วันที่สิ้นสุด</Label>
                    <Input name="end_date" type="date" defaultValue={event.end_date} required />
                  </div>
                </div>
                <Button className="w-full" type="submit" icon="save">
                  บันทึกงาน
                </Button>
              </Card>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
