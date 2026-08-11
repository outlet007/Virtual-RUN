import Link from "next/link";
import { Medal as MedalIcon, Lock, Upload, UserPlus } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { tx, type Locale } from "@/lib/i18n/shared";

export type MedalEntry = {
  key: string;
  name: string;
  tier: string;
  imageUrl: string | null;
  earned: boolean;
  unlockedAt: string | null;
  progressKm: number;
  targetKm: number;
  eventId: string;
  eventTitle: string;
  registrationStatus: string | null;
  registrationOpen: boolean;
  registrationHref: string;
};

const tierLabel: Record<string, string> = {
  bronze: "บรอนซ์",
  silver: "เงิน",
  gold: "ทอง",
  legendary: "ตำนาน",
};

export function MedalHexagon({ entry, locale }: { entry: MedalEntry; locale: Locale }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative flex aspect-square w-full items-center justify-center">
        {entry.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={entry.imageUrl}
            alt={entry.name}
            className={`h-full w-full object-contain ${
              entry.earned ? "" : "opacity-40 grayscale"
            }`}
          />
        ) : (
          <MedalIcon
            className={`h-2/3 w-2/3 text-medal ${entry.earned ? "" : "opacity-40 grayscale"}`}
          />
        )}
        {!entry.earned && (
          <span className="absolute left-1/2 top-1/2 grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black/65 shadow-sm">
            <Lock className="h-4 w-4 text-white" />
          </span>
        )}
      </div>
      <p className="mt-3 font-display font-bold">{entry.name}</p>
      <p className="text-xs text-ink/50">{entry.eventTitle}</p>
      <p className="mt-1 text-xs text-ink/40">{locale === "en" ? entry.tier[0].toUpperCase() + entry.tier.slice(1) : tierLabel[entry.tier] ?? entry.tier}</p>
      {entry.earned ? (
        <>
          {entry.unlockedAt && (
            <p className="mt-1 font-mono text-xs text-ink/40 tnum">
              {formatDate(entry.unlockedAt)}
            </p>
          )}
          <span className="mt-2 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
            {tx(locale, "สำเร็จแล้ว", "Completed")}
          </span>
        </>
      ) : (
        <>
          <p className="mt-2 font-mono text-xs text-ink/50 tnum">
            {Math.min(entry.progressKm, entry.targetKm).toFixed(1)} / {entry.targetKm} km
          </p>
          {!entry.registrationStatus && entry.registrationOpen ? (
            <Link
              href={entry.registrationHref}
              className="mt-3 inline-flex min-h-9 items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-ink transition hover:bg-primary-hover"
            >
              <UserPlus className="size-4" aria-hidden="true" />
              {tx(locale, "สมัครเพื่อปลดล็อก", "Register to unlock")}
            </Link>
          ) : !entry.registrationStatus ? (
            <span className="mt-3 inline-flex min-h-9 items-center justify-center rounded-full bg-lane px-4 py-2 text-xs font-semibold text-muted">
              {tx(locale, "งานสิ้นสุดแล้ว", "Event ended")}
            </span>
          ) : entry.registrationStatus === "confirmed" ? (
            <Link
              href="/dashboard/submit"
              className="mt-3 inline-flex min-h-9 items-center justify-center gap-2 rounded-full border border-primary-dark/20 bg-primary-soft px-4 py-2 text-xs font-semibold text-primary-dark transition hover:bg-primary/30"
            >
              <Upload className="size-4" aria-hidden="true" />
              {tx(locale, "ส่งผลวิ่งเพื่อปลดล็อก", "Submit activity to unlock")}
            </Link>
          ) : (
            <span className="mt-3 inline-flex min-h-9 items-center justify-center rounded-full bg-lane px-4 py-2 text-xs font-semibold text-muted">
              {tx(locale, "รอยืนยันการสมัคร", "Awaiting confirmation")}
            </span>
          )}
        </>
      )}
    </div>
  );
}
