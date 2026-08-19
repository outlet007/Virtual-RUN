"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  Medal,
  BarChart3,
  History,
  Settings,
  Pencil,
  Trophy,
  Route,
  Footprints,
  Gift,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { tx, type Locale } from "@/lib/i18n/shared";

export function DashboardSidebar({
  name,
  avatarUrl,
  levelProgress,
  rankSummary,
  locale,
}: {
  name: string;
  avatarUrl: string | null;
  levelProgress: {
    level: number;
    levelName: string;
    currentXp: number;
    xpPerLevel: number;
    totalXp: number;
    nextLevelXp: number | null;
    isMaxLevel: boolean;
  };
  rankSummary: {
    total_users: number;
    points: number;
    points_rank: number;
    distance_km: number;
    distance_rank: number;
    approved_runs: number;
    approved_runs_rank: number;
  } | null;
  locale: Locale;
}) {
  const pathname = usePathname();
  const pct = levelProgress.isMaxLevel
    ? 100
    : Math.min(100, Math.round((levelProgress.currentXp / levelProgress.xpPerLevel) * 100));
  const items = [
    { href: "/dashboard", label: tx(locale, "แดชบอร์ด", "Dashboard"), icon: LayoutDashboard },
    { href: "/dashboard/events", label: tx(locale, "งานของฉัน", "My events"), icon: ClipboardList },
    { href: "/dashboard/medals", label: tx(locale, "เหรียญรางวัล", "Medals"), icon: Medal },
    { href: "/dashboard/stats", label: tx(locale, "สถิติของฉัน", "My stats"), icon: BarChart3 },
    { href: "/dashboard/history", label: tx(locale, "ประวัติการเข้าร่วม", "History"), icon: History },
    { href: "/dashboard/rewards", label: tx(locale, "แลกแต้มเป็นรางวัล", "Rewards"), icon: Gift },
    { href: "/profile", label: tx(locale, "ตั้งค่าโปรไฟล์", "Profile settings"), icon: Settings },
  ];

  return (
    <div className="w-full shrink-0 space-y-4 lg:w-56">
      {/* Level/XP คำนวณจากแต้มสะสมและเกณฑ์ Level ที่ผู้ดูแลระบบกำหนด */}
      <div className="overflow-hidden rounded-2xl bg-gradient-to-b from-ink to-[#1a2472] p-5 text-center text-[#FAFAF8]">
        <div className="relative mx-auto h-20 w-20">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="h-20 w-20 rounded-full object-cover" />
          ) : (
            <span className="grid h-20 w-20 place-items-center rounded-full bg-white/10 font-display text-2xl font-bold">
              {name.trim().charAt(0).toUpperCase()}
            </span>
          )}
          <Link
            href="/profile"
            aria-label={tx(locale, "แก้ไขโปรไฟล์", "Edit profile")}
            className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full bg-primary text-ink transition hover:bg-primary-hover"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Link>
        </div>
        <p className="mt-[1.2rem] truncate font-display text-base font-bold">{name}</p>
        <span className="mt-2 inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-primary">
          Level {levelProgress.level} · {levelProgress.levelName}
        </span>
        <div className="mt-[1.2rem]">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/20">
            <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-1 text-right font-mono text-[11px] text-[#FAFAF8] tnum">
            {levelProgress.isMaxLevel
              ? `${levelProgress.totalXp.toLocaleString("th-TH")} XP · MAX`
              : `${levelProgress.currentXp.toLocaleString("th-TH")} / ${levelProgress.xpPerLevel.toLocaleString("th-TH")} XP`}
          </p>
        </div>
        {rankSummary && (
          <div className="mt-4 border-t border-white/15 pt-4 text-left">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#FAFAF8]">
                <Trophy className="size-3.5 text-primary" aria-hidden="true" />
                {tx(locale, "อันดับของฉัน", "My ranking")}
              </span>
              <span className="text-[10px] text-[#FAFAF8] tnum">
                {tx(locale, "จาก", "of")} {rankSummary.total_users.toLocaleString(locale === "en" ? "en-US" : "th-TH")} {tx(locale, "คน", "users")}
              </span>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between gap-2 rounded-lg bg-white/10 px-2.5 py-2">
                <span className="inline-flex min-w-0 items-center gap-1.5 text-[#FAFAF8]">
                  <Trophy className="size-3 shrink-0" aria-hidden="true" />
                  {tx(locale, "คะแนน", "Points")} {rankSummary.points.toLocaleString(locale === "en" ? "en-US" : "th-TH")}
                </span>
                <strong className="shrink-0 font-mono text-[#FEC81D] tnum">
                  #{rankSummary.points_rank.toLocaleString("th-TH")}
                </strong>
              </div>
              <div className="flex items-center justify-between gap-2 rounded-lg bg-white/10 px-2.5 py-2">
                <span className="inline-flex min-w-0 items-center gap-1.5 text-[#FAFAF8]">
                  <Route className="size-3 shrink-0" aria-hidden="true" />
                  {tx(locale, "ระยะ", "Distance")} {Number(rankSummary.distance_km).toLocaleString(locale === "en" ? "en-US" : "th-TH", { maximumFractionDigits: 1 })} {tx(locale, "กม.", "km")}
                </span>
                <strong className="shrink-0 font-mono text-[#FEC81D] tnum">
                  #{rankSummary.distance_rank.toLocaleString("th-TH")}
                </strong>
              </div>
              <div className="flex items-center justify-between gap-2 rounded-lg bg-white/10 px-2.5 py-2">
                <span className="inline-flex min-w-0 items-center gap-1.5 text-[#FAFAF8]">
                  <Footprints className="size-3 shrink-0" aria-hidden="true" />
                  {tx(locale, "กิจกรรม", "Activities")} {rankSummary.approved_runs.toLocaleString(locale === "en" ? "en-US" : "th-TH")}
                </span>
                <strong className="shrink-0 font-mono text-[#FEC81D] tnum">
                  #{rankSummary.approved_runs_rank.toLocaleString("th-TH")}
                </strong>
              </div>
            </div>
          </div>
        )}
      </div>

      <nav className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:block lg:space-y-1">
        {items.map((item) => {
          // /dashboard ต้อง match เป๊ะ ไม่งั้น active ทับกับ /dashboard/events ฯลฯ ที่ก็ขึ้นต้นด้วย /dashboard เหมือนกัน
          const active =
            item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-w-0 items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition sm:gap-3 sm:px-4",
                active ? "bg-ink text-paper" : "text-ink/60 hover:bg-lane/60",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="min-w-0 leading-snug">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
