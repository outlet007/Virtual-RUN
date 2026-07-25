"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button, Card, Input, Label, Textarea, Select, ImageUploadField } from "@/components/ui";
import { updateEvent } from "@/lib/actions/admin";

type EventForModal = {
  id: string;
  title: string;
  description: string | null;
  cover_image: string | null;
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
      <Button variant="ghost" type="button" onClick={() => setOpen(true)}>
        แก้ไขงาน
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <form action={updateEvent}>
              <input type="hidden" name="id" value={event.id} />
              <input type="hidden" name="existing_cover_image" value={event.cover_image ?? ""} />
              <input type="hidden" name="existing_poster_image" value={event.poster_image ?? ""} />
              <Card className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-lg font-bold">แก้ไขงาน</h3>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="leading-none text-ink/40 hover:text-ink"
                    aria-label="ปิด"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div>
                  <Label>ชื่องาน</Label>
                  <Input name="title" defaultValue={event.title} required />
                </div>
                <div>
                  <Label>รายละเอียด</Label>
                  <Textarea name="description" rows={4} defaultValue={event.description ?? ""} />
                </div>
                <ImageUploadField
                  name="cover_image_file"
                  label="รูปปกงาน (banner)"
                  defaultImageUrl={event.cover_image}
                />
                <ImageUploadField
                  name="poster_image_file"
                  label="รูป poster"
                  defaultImageUrl={event.poster_image}
                />
                <div className="grid grid-cols-2 gap-3">
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
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>วันที่เริ่ม</Label>
                    <Input name="start_date" type="date" defaultValue={event.start_date} required />
                  </div>
                  <div>
                    <Label>วันที่สิ้นสุด</Label>
                    <Input name="end_date" type="date" defaultValue={event.end_date} required />
                  </div>
                </div>
                <Button className="w-full" type="submit">
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
