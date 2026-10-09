"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Gift, X } from "lucide-react";
import { redeemReward } from "@/lib/actions/rewards";
import { Badge, Button } from "@/components/ui";
import { pickLocalized, tx, type Locale } from '@/lib/i18n/shared';

type RewardForRedeem = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  cost_points: number;
  stock: number;
  allows_pickup: boolean;
  allows_shipping: boolean;
  pickup_location: {
    name: string;
    name_en: string | null;
    address: string;
    address_en: string | null;
    contact_phone: string | null;
    contact_phone_en: string | null;
    maps_url: string | null;
    instructions: string | null;
    instructions_en: string | null;
  } | null;
};

type ShippingAddress = {
  recipient: string | null;
  phone: string | null;
  address: string | null;
  province: string | null;
  postal_code: string | null;
};

export function RewardRedeemButton({
  reward,
  balance,
  locale,
  shippingAddress,
  hasCompleteAddress,
}: {
  reward: RewardForRedeem;
  balance: number;
  locale: Locale;
  shippingAddress: ShippingAddress;
  hasCompleteAddress: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [fulfillmentMethod, setFulfillmentMethod] = useState<'pickup' | 'shipping'>(
    reward.allows_pickup ? 'pickup' : 'shipping',
  );
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const pickupLocation = reward.pickup_location;
  const pickupName = pickupLocation
    ? pickLocalized(locale, pickupLocation.name, pickupLocation.name_en)
    : '';
  const pickupAddress = pickupLocation
    ? pickLocalized(locale, pickupLocation.address, pickupLocation.address_en)
    : '';
  const pickupInstructions = pickupLocation
    ? pickLocalized(locale, pickupLocation.instructions, pickupLocation.instructions_en)
    : '';
  const cannotSubmit = fulfillmentMethod === 'shipping' && !hasCompleteAddress;

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    dialogRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <>
      <Button type="button" icon="gift" className="w-full" onClick={() => setOpen(true)}>
        {tx(locale, "แลก", "Redeem")}
      </Button>

      {open && (
        <div
          ref={dialogRef}
          tabIndex={-1}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm outline-none sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={reward.description ? descriptionId : undefined}
          onClick={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <form
            action={redeemReward}
            className="max-h-[calc(100vh-1.5rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-lane bg-white p-4 shadow-2xl sm:p-6"
          >
            <input type="hidden" name="reward_id" value={reward.id} />
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary-dark">
                  {tx(locale, "ยืนยันการแลกรางวัล", "Confirm reward redemption")}
                </p>
                <h2 id={titleId} className="mt-1 flex items-center gap-2 font-display text-xl font-bold text-ink">
                  <Gift className="size-5 shrink-0 text-primary-dark" aria-hidden="true" />
                  {reward.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid size-9 shrink-0 place-items-center rounded-full text-ink/45 hover:bg-lane/60 hover:text-ink"
                aria-label={tx(locale, "ปิด", "Close")}
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-4 overflow-hidden rounded-xl border border-lane bg-lane/20">
              {reward.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={reward.image_url}
                  alt={reward.name}
                  className="aspect-[16/9] w-full object-cover"
                />
              ) : (
                <div className="grid aspect-[16/9] w-full place-items-center text-ink/30">
                  <Gift className="size-12" aria-hidden="true" />
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Badge className="bg-primary-soft text-primary-dark">
                {reward.cost_points.toLocaleString(locale === "en" ? "en-US" : "th-TH")} {tx(locale, "แต้ม", "points")}
              </Badge>
              <Badge className="bg-lane text-ink/60">
                {tx(locale, "คงเหลือ", "In stock")} {reward.stock.toLocaleString(locale === "en" ? "en-US" : "th-TH")}
              </Badge>
            </div>

            {reward.description && (
              <p id={descriptionId} className="mt-3 whitespace-pre-line text-sm leading-6 text-ink/65">
                {reward.description}
              </p>
            )}

            <input type='hidden' name='fulfillment_method' value={fulfillmentMethod} />

            <fieldset className='mt-4 space-y-2'>
              <legend className='text-sm font-semibold text-ink'>
                {tx(locale, 'วิธีรับรางวัล', 'Fulfillment method')}
              </legend>
              <div className='grid gap-2 sm:grid-cols-2'>
                {reward.allows_pickup && (
                  <label className='flex cursor-pointer gap-3 rounded-xl border border-lane p-3 text-sm'>
                    <input
                      type='radio'
                      checked={fulfillmentMethod === 'pickup'}
                      onChange={() => setFulfillmentMethod('pickup')}
                    />
                    <span>{tx(locale, 'รับด้วยตนเอง', 'Pick up')}</span>
                  </label>
                )}
                {reward.allows_shipping && (
                  <label className='flex cursor-pointer gap-3 rounded-xl border border-lane p-3 text-sm'>
                    <input
                      type='radio'
                      checked={fulfillmentMethod === 'shipping'}
                      onChange={() => setFulfillmentMethod('shipping')}
                    />
                    <span>{tx(locale, 'จัดส่ง', 'Shipping')}</span>
                  </label>
                )}
              </div>
            </fieldset>

            <div className='mt-3 rounded-xl border border-lane bg-lane/20 p-4 text-sm leading-6 text-ink/65'>
              {fulfillmentMethod === 'pickup' ? (
                <>
                  <p className='font-semibold text-ink'>{pickupName}</p>
                  <p>{pickupAddress}</p>
                  {(pickupLocation?.contact_phone || pickupLocation?.contact_phone_en) && (
                    <p>{pickLocalized(locale, pickupLocation?.contact_phone ?? '', pickupLocation?.contact_phone_en)}</p>
                  )}
                  {pickupInstructions && <p className='mt-1'>{pickupInstructions}</p>}
                  {pickupLocation?.maps_url && (
                    <a className='mt-2 inline-block font-semibold text-primary-dark underline' href={pickupLocation.maps_url} target='_blank' rel='noreferrer'>
                      {tx(locale, 'เปิดแผนที่', 'Open map')}
                    </a>
                  )}
                </>
              ) : hasCompleteAddress ? (
                <>
                  <p className='font-semibold text-ink'>{shippingAddress.recipient}</p>
                  <p>{shippingAddress.address}</p>
                  <p>{shippingAddress.province} {shippingAddress.postal_code}</p>
                  {shippingAddress.phone && <p>{shippingAddress.phone}</p>}
                </>
              ) : (
                <p className='text-red-700'>
                  {tx(locale, 'กรุณากรอกที่อยู่ในหน้าโปรไฟล์ให้ครบก่อนเลือกจัดส่ง', 'Complete your profile address before choosing shipping.')}
                </p>
              )}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-lane/35 p-4 text-sm">
              <div>
                <p className="text-ink/50">{tx(locale, "แต้มปัจจุบัน", "Current points")}</p>
                <p className="mt-1 font-mono text-lg font-bold text-[#F5A524] tnum">
                  {balance.toLocaleString("th-TH")}
                </p>
              </div>
              <div>
                <p className="text-ink/50">{tx(locale, "แต้มคงเหลือหลังแลก", "Points after redemption")}</p>
                <p className="mt-1 font-mono text-lg font-bold text-ink tnum">
                  {(balance - reward.cost_points).toLocaleString("th-TH")}
                </p>
              </div>
            </div>

            <p className="mt-4 text-sm text-ink/60">
              {tx(locale, "กรุณาตรวจสอบรายละเอียดให้ถูกต้องก่อนยืนยัน ระบบจะหักแต้มทันทีหลังแลกสำเร็จ", "Review the details before confirming. Points are deducted immediately after redemption.")}
            </p>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="ghost" icon="reject" onClick={() => setOpen(false)}>
                {tx(locale, "ยกเลิก", "Cancel")}
              </Button>
              <Button type="submit" icon="confirm" disabled={cannotSubmit}>
                {tx(locale, "ยืนยันการแลก", "Confirm redemption")}
              </Button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
