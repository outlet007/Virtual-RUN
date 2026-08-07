"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Gift, X } from "lucide-react";
import { redeemReward } from "@/lib/actions/rewards";
import { Badge, Button } from "@/components/ui";

type RewardForRedeem = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  cost_points: number;
  stock: number;
};

export function RewardRedeemButton({
  reward,
  balance,
}: {
  reward: RewardForRedeem;
  balance: number;
}) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();

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
        แลก
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
                  ยืนยันการแลกรางวัล
                </p>
                <h2 id={titleId} className="mt-1 font-display text-xl font-bold text-ink">
                  {reward.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid size-9 shrink-0 place-items-center rounded-full text-ink/45 hover:bg-lane/60 hover:text-ink"
                aria-label="ปิด"
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
                {reward.cost_points.toLocaleString("th-TH")} แต้ม
              </Badge>
              <Badge className="bg-lane text-ink/60">
                คงเหลือ {reward.stock.toLocaleString("th-TH")}
              </Badge>
            </div>

            {reward.description && (
              <p id={descriptionId} className="mt-3 whitespace-pre-line text-sm leading-6 text-ink/65">
                {reward.description}
              </p>
            )}

            <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-lane/35 p-4 text-sm">
              <div>
                <p className="text-ink/50">แต้มปัจจุบัน</p>
                <p className="mt-1 font-mono text-lg font-bold text-[#F5A524] tnum">
                  {balance.toLocaleString("th-TH")}
                </p>
              </div>
              <div>
                <p className="text-ink/50">แต้มคงเหลือหลังแลก</p>
                <p className="mt-1 font-mono text-lg font-bold text-ink tnum">
                  {(balance - reward.cost_points).toLocaleString("th-TH")}
                </p>
              </div>
            </div>

            <p className="mt-4 text-sm text-ink/60">
              กรุณาตรวจสอบรายละเอียดให้ถูกต้องก่อนยืนยัน ระบบจะหักแต้มทันทีหลังแลกสำเร็จ
            </p>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="ghost" icon="reject" onClick={() => setOpen(false)}>
                ยกเลิก
              </Button>
              <Button type="submit" icon="confirm">
                ยืนยันการแลก
              </Button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
