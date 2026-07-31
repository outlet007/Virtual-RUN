import { Medal as MedalIcon, Lock } from "lucide-react";
import { formatDate } from "@/lib/utils";

export type MedalEntry = {
  key: string;
  name: string;
  tier: string;
  imageUrl: string | null;
  earned: boolean;
  unlockedAt: string | null;
  progressKm: number;
  targetKm: number;
  eventTitle: string;
};

const tierGradient: Record<string, string> = {
  bronze: "from-[#a9724a] to-[#6b4327]",
  silver: "from-[#c7cdd4] to-[#8a929c]",
  gold: "from-[#ffd76a] to-[#e0a52a]",
  legendary: "from-[#8b6bd8] to-[#4a3591]",
};

const tierLabel: Record<string, string> = {
  bronze: "บรอนซ์",
  silver: "เงิน",
  gold: "ทอง",
  legendary: "ตำนาน",
};

export function MedalHexagon({ entry }: { entry: MedalEntry }) {
  const gradient = tierGradient[entry.tier] ?? tierGradient.bronze;

  return (
    <div className="flex flex-col items-center text-center">
      <div
        className={`relative flex h-32 w-28 items-center justify-center bg-gradient-to-br ${gradient} ${
          entry.earned ? "" : "opacity-40 grayscale"
        }`}
        style={{
          clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
        }}
      >
        {entry.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={entry.imageUrl} alt="" className="h-16 w-16 object-contain" />
        ) : (
          <MedalIcon className="h-12 w-12 text-white/90" />
        )}
        {!entry.earned && (
          <span className="absolute inset-0 grid place-items-center bg-black/20">
            <Lock className="h-6 w-6 text-white" />
          </span>
        )}
      </div>
      <p className="mt-3 font-display font-bold">{entry.name}</p>
      <p className="text-xs text-ink/50">{entry.eventTitle}</p>
      <p className="mt-1 text-xs text-ink/40">{tierLabel[entry.tier] ?? entry.tier}</p>
      {entry.earned ? (
        <>
          {entry.unlockedAt && (
            <p className="mt-1 font-mono text-xs text-ink/40 tnum">
              {formatDate(entry.unlockedAt)}
            </p>
          )}
          <span className="mt-2 rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-semibold text-primary-dark">
            สำเร็จแล้ว
          </span>
        </>
      ) : (
        <p className="mt-2 font-mono text-xs text-ink/50 tnum">
          {Math.min(entry.progressKm, entry.targetKm).toFixed(1)} / {entry.targetKm} km
        </p>
      )}
    </div>
  );
}
