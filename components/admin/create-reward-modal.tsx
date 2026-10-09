"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button, Card, HeadingIcon, ImageUploadField, Input, Label, Select, Textarea } from '@/components/ui';
import { createReward } from "@/lib/actions/admin";

type PickupLocationOption = {
  id: string;
  name: string;
  is_primary: boolean;
};

export function CreateRewardModal({
  initialOpen = false,
  error,
  locations,
}: {
  initialOpen?: boolean;
  error?: string;
  locations: PickupLocationOption[];
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
        เพิ่มรางวัลใหม่
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
              aria-labelledby="create-reward-title"
            >
              <form action={createReward}>
                <Card className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 id="create-reward-title" className="flex items-center gap-2 font-display text-lg font-bold">
                        <HeadingIcon name="gift" />
                        เพิ่มรางวัลใหม่
                      </h3>
                      <p className="mt-1 text-sm text-ink/50">
                        กรอกข้อมูลรางวัล แต้มที่ใช้แลก และจำนวนคงเหลือ
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-ink/40 transition hover:bg-lane/50 hover:text-ink"
                      aria-label="ปิดหน้าต่างเพิ่มรางวัล"
                    >
                      <X className="size-5" aria-hidden="true" />
                    </button>
                  </div>

                  {error && (
                    <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                      {error}
                    </div>
                  )}

                  <ImageUploadField name="image_file" label="รูปรางวัล" />
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="sm:col-span-2">
                      <Label>ชื่อรางวัล (ไทย)</Label>
                      <Input name="name" required autoFocus />
                    </div>
                    <div className="sm:col-span-2"><Label>Reward Name (English)</Label><Input name="name_en" /></div>
                    <div>
                      <Label>แต้มที่ใช้แลก</Label>
                      <Input name="cost_points" type="number" min="1" required />
                    </div>
                  </div>
                  <div><Label>Description (English)</Label><Textarea name="description_en" rows={3} /></div>
                  <div>
                    <Label>รายละเอียดรางวัล</Label>
                    <Textarea
                      name="description"
                      rows={3}
                      placeholder="อธิบายรายละเอียด เงื่อนไข หรือสิ่งที่ผู้ใช้จะได้รับ"
                    />
                  </div>
                  <div>
                    <Label>จำนวนคงเหลือ</Label>
                    <Input name="stock" type="number" min="0" defaultValue={0} />
                  </div>
                  <div>
                    <Label>สถานที่รับรางวัล</Label>
                    <Select
                      name='pickup_location_id'
                      defaultValue={locations.find((location) => location.is_primary)?.id ?? locations[0]?.id}
                      required
                    >
                      {locations.map((location) => (
                        <option key={location.id} value={location.id}>
                          {location.name}{location.is_primary ? ' (สถานที่หลัก)' : ''}
                        </option>
                      ))}
                    </Select>
                    {locations.length === 0 && (
                      <p className='mt-2 text-sm text-red-700'>กรุณาเพิ่มสถานที่รับรางวัลในแท็บสถานที่รับของรางวัลก่อน</p>
                    )}
                  </div>
                  <fieldset className='space-y-2'>
                    <legend className='text-sm font-medium text-ink/70'>วิธีรับรางวัลที่รองรับ</legend>
                    <label className='flex min-h-11 items-center gap-2 rounded-xl border border-lane px-3'>
                      <input type='checkbox' name='allows_pickup' defaultChecked /> รับด้วยตนเอง
                    </label>
                    <label className='flex min-h-11 items-center gap-2 rounded-xl border border-lane px-3'>
                      <input type='checkbox' name='allows_shipping' defaultChecked /> จัดส่ง
                    </label>
                  </fieldset>
                  <Button className="w-full" type="submit" icon="add" disabled={locations.length === 0}>
                    เพิ่มรางวัล
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
