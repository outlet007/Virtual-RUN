'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { Button, Card, HeadingIcon, Input, Label, Textarea } from '@/components/ui';
import { useDialogFocus } from '@/components/use-dialog-focus';
import {
  createRewardPickupLocation,
  updateRewardPickupLocation,
} from '@/lib/actions/reward-locations';
import type { RewardPickupLocation } from './reward-pickup-locations-tab';

export function CreateRewardPickupLocationModal({
  initialOpen = false,
  error,
}: {
  initialOpen?: boolean;
  error?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(initialOpen);
  const triggerRef = useRef<HTMLButtonElement>(null);

  function closeModal() {
    setOpen(false);
    if (initialOpen) router.replace('/admin/rewards?tab=locations', { scroll: false });
  }

  return (
    <>
      <Button ref={triggerRef} type='button' icon='add' onClick={() => setOpen(true)}>
        เพิ่มสถานที่ใหม่
      </Button>
      <LocationModal
        mode='create'
        open={open}
        error={error}
        returnFocusRef={triggerRef}
        onClose={closeModal}
      />
    </>
  );
}

export function EditRewardPickupLocationModal({
  location,
  error,
}: {
  location: RewardPickupLocation;
  error?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(true);

  function closeModal() {
    setOpen(false);
    router.replace('/admin/rewards?tab=locations', { scroll: false });
  }

  return (
    <LocationModal
      mode='edit'
      open={open}
      location={location}
      error={error}
      onClose={closeModal}
    />
  );
}

function LocationModal({
  mode,
  open,
  location,
  error,
  returnFocusRef,
  onClose,
}: {
  mode: 'create' | 'edit';
  open: boolean;
  location?: RewardPickupLocation;
  error?: string;
  returnFocusRef?: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const isEdit = mode === 'edit';

  useEffect(() => setMounted(true), []);
  useDialogFocus({
    open,
    dialogRef,
    initialFocusRef: closeRef,
    returnFocusRef,
    onClose,
  });

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className='fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-2 backdrop-blur-sm sm:p-4'
      onClick={onClose}
      role='presentation'
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className='max-h-[calc(100vh-1rem)] w-full max-w-3xl overflow-y-auto outline-none sm:max-h-[calc(100vh-2rem)]'
        onClick={(event) => event.stopPropagation()}
        role='dialog'
        aria-modal='true'
        aria-labelledby='pickup-location-modal-title'
      >
        <form action={isEdit ? updateRewardPickupLocation : createRewardPickupLocation}>
          {isEdit && <input type='hidden' name='id' value={location?.id} />}
          <Card className='space-y-4'>
            <div className='flex items-start justify-between gap-3'>
              <div className='min-w-0'>
                <h3 id='pickup-location-modal-title' className='flex items-center gap-2 font-display text-lg font-bold'>
                  <HeadingIcon name='mapPin' />
                  {isEdit ? 'แก้ไขสถานที่รับของรางวัล' : 'เพิ่มสถานที่รับของรางวัล'}
                </h3>
                <p className='mt-1 text-sm text-ink/50'>
                  {isEdit ? location?.name : 'กรอกข้อมูลสถานที่สำหรับให้ผู้ใช้มารับของรางวัล'}
                </p>
              </div>
              <button
                ref={closeRef}
                type='button'
                onClick={onClose}
                className='inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-ink/40 transition hover:bg-lane/50 hover:text-ink'
                aria-label='ปิดหน้าต่าง'
              >
                <X className='size-5' aria-hidden='true' />
              </button>
            </div>

            {error && (
              <div className='rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700' role='alert'>
                {error}
              </div>
            )}

            <LocationFields location={location} />
            <label className='flex min-h-11 items-center gap-2 rounded-xl border border-lane px-3'>
              <input
                type='checkbox'
                name='is_primary'
                defaultChecked={location?.is_primary}
                disabled={location?.is_primary}
              />
              ตั้งเป็นสถานที่หลัก
            </label>
            <Button className='w-full' type='submit' icon={isEdit ? 'save' : 'add'}>
              {isEdit ? 'บันทึกสถานที่' : 'เพิ่มสถานที่'}
            </Button>
          </Card>
        </form>
      </div>
    </div>,
    document.body,
  );
}

function LocationFields({ location }: { location?: RewardPickupLocation }) {
  return (
    <div className='grid gap-4 md:grid-cols-2'>
      <div>
        <Label htmlFor='pickup-location-name'>ชื่อสถานที่ (ไทย)</Label>
        <Input id='pickup-location-name' name='name' defaultValue={location?.name ?? ''} maxLength={200} required />
      </div>
      <div>
        <Label htmlFor='pickup-location-name-en'>Location name (English)</Label>
        <Input id='pickup-location-name-en' name='name_en' defaultValue={location?.name_en ?? ''} maxLength={200} />
      </div>
      <div className='md:col-span-2'>
        <Label htmlFor='pickup-location-address'>ที่อยู่ (ไทย)</Label>
        <Textarea id='pickup-location-address' name='address' defaultValue={location?.address ?? ''} maxLength={1000} rows={3} required />
      </div>
      <div className='md:col-span-2'>
        <Label htmlFor='pickup-location-address-en'>Address (English)</Label>
        <Textarea id='pickup-location-address-en' name='address_en' defaultValue={location?.address_en ?? ''} maxLength={1000} rows={3} />
      </div>
      <div>
        <Label htmlFor='pickup-location-phone'>เบอร์ติดต่อ (ไทย)</Label>
        <Input id='pickup-location-phone' name='contact_phone' defaultValue={location?.contact_phone ?? ''} maxLength={50} />
      </div>
      <div>
        <Label htmlFor='pickup-location-phone-en'>Contact phone (English)</Label>
        <Input id='pickup-location-phone-en' name='contact_phone_en' defaultValue={location?.contact_phone_en ?? ''} maxLength={50} />
      </div>
      <div>
        <Label htmlFor='pickup-location-map'>ลิงก์แผนที่</Label>
        <Input id='pickup-location-map' name='maps_url' type='url' defaultValue={location?.maps_url ?? ''} maxLength={2000} />
      </div>
      <div>
        <Label htmlFor='pickup-location-instructions'>คำแนะนำการรับของ (ไทย)</Label>
        <Textarea id='pickup-location-instructions' name='instructions' defaultValue={location?.instructions ?? ''} maxLength={1000} rows={3} />
      </div>
      <div>
        <Label htmlFor='pickup-location-instructions-en'>Pickup instructions (English)</Label>
        <Textarea id='pickup-location-instructions-en' name='instructions_en' defaultValue={location?.instructions_en ?? ''} maxLength={1000} rows={3} />
      </div>
      <label className='flex min-h-11 items-center gap-2 rounded-xl border border-lane px-3 md:col-span-2'>
        <input type='checkbox' name='is_active' defaultChecked={location?.is_active ?? true} /> เปิดใช้งาน
      </label>
    </div>
  );
}
