"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button, HeadingIcon, ImageUploadField, Input, Label, Select, Textarea } from '@/components/ui';
import { useDialogFocus } from "@/components/use-dialog-focus";
import { updateReward } from "@/lib/actions/admin";

type RewardForEdit = {
  id: string;
  name: string;
  name_en: string | null;
  description: string | null;
  description_en: string | null;
  image_url: string | null;
  cost_points: number;
  stock: number;
  pickup_location_id: string | null;
  allows_pickup: boolean;
  allows_shipping: boolean;
};

type PickupLocationOption = {
  id: string;
  name: string;
  is_primary: boolean;
};

export function EditRewardModal({
  reward,
  error,
  locations,
}: {
  reward: RewardForEdit;
  error?: string;
  locations: PickupLocationOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [mounted, setMounted] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setMounted(true), []);

  function closeModal() {
    setOpen(false);
    router.replace("/admin/rewards?tab=catalog", { scroll: false });
  }

  useDialogFocus({
    open,
    dialogRef,
    initialFocusRef: closeRef,
    onClose: closeModal,
  });

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
              ref={dialogRef}
              tabIndex={-1}
              className="flex max-h-[calc(100vh-1rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-paper shadow-2xl sm:max-h-[calc(100vh-2rem)]"
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="edit-reward-title"
            >
              <div className="flex shrink-0 items-start justify-between gap-3 border-b border-lane bg-paper px-4 py-4 sm:px-6">
                <div className="min-w-0">
                  <h3 id="edit-reward-title" className="flex items-center gap-2 font-display text-lg font-bold">
                    <HeadingIcon name="edit" />
                    แก้ไขรางวัล
                  </h3>
                  <p className="mt-1 truncate text-sm text-ink/50">{reward.name}</p>
                </div>
                <button
                  ref={closeRef}
                  type="button"
                  onClick={closeModal}
                  className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-ink/40 transition hover:bg-lane/50 hover:text-ink"
                  aria-label="ปิดหน้าต่างแก้ไขรางวัล"
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

                <form action={updateReward}>
                  <input type="hidden" name="id" value={reward.id} />
                  <input type="hidden" name="existing_image_url" value={reward.image_url ?? ""} />
                  <div className="space-y-4">
                    <ImageUploadField
                      name="image_file"
                      label="รูปรางวัล"
                      defaultImageUrl={reward.image_url}
                    />
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="sm:col-span-2">
                        <Label>ชื่อรางวัล (ไทย)</Label>
                        <Input name="name" defaultValue={reward.name} required autoFocus />
                      </div>
                      <div className="sm:col-span-2">
                        <Label>Reward Name (English)</Label>
                        <Input name="name_en" defaultValue={reward.name_en ?? ""} />
                      </div>
                      <div>
                        <Label>แต้มที่ใช้แลก</Label>
                        <Input
                          name="cost_points"
                          type="number"
                          min="1"
                          defaultValue={reward.cost_points}
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <Label>รายละเอียดรางวัล</Label>
                      <Textarea
                        name="description"
                        rows={3}
                        defaultValue={reward.description ?? ""}
                        placeholder="อธิบายรายละเอียด เงื่อนไข หรือสิ่งที่ผู้ใช้จะได้รับ"
                      />
                    </div>
                    <div>
                      <Label>Description (English)</Label>
                      <Textarea name="description_en" rows={3} defaultValue={reward.description_en ?? ""} />
                    </div>
                    <div>
                      <Label>จำนวนคงเหลือ</Label>
                      <Input name="stock" type="number" min="0" defaultValue={reward.stock} />
                    </div>
                    <div>
                      <Label>สถานที่รับรางวัล</Label>
                      <Select
                        name='pickup_location_id'
                        defaultValue={reward.pickup_location_id ?? locations.find((location) => location.is_primary)?.id}
                        required
                      >
                        {locations.map((location) => (
                          <option key={location.id} value={location.id}>
                            {location.name}{location.is_primary ? ' (สถานที่หลัก)' : ''}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <fieldset className='space-y-2'>
                      <legend className='text-sm font-medium text-ink/70'>วิธีรับรางวัลที่รองรับ</legend>
                      <label className='flex min-h-11 items-center gap-2 rounded-xl border border-lane px-3'>
                        <input type='checkbox' name='allows_pickup' defaultChecked={reward.allows_pickup} /> รับด้วยตนเอง
                      </label>
                      <label className='flex min-h-11 items-center gap-2 rounded-xl border border-lane px-3'>
                        <input type='checkbox' name='allows_shipping' defaultChecked={reward.allows_shipping} /> จัดส่ง
                      </label>
                    </fieldset>
                    <Button className="w-full" type="submit" icon="save">
                      บันทึกรางวัลนี้
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
