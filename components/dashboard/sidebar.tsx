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
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", label: "แดชบอร์ด", icon: LayoutDashboard },
  { href: "/dashboard/events", label: "งานของฉัน", icon: ClipboardList },
  { href: "/dashboard/medals", label: "เหรียญรางวัล", icon: Medal },
  { href: "/dashboard/stats", label: "สถิติของฉัน", icon: BarChart3 },
  { href: "/dashboard/history", label: "ประวัติการเข้าร่วม", icon: History },
  { href: "/profile", label: "ตั้งค่าโปรไฟล์", icon: Settings },
];

export function DashboardSidebar({
  name,
  avatarUrl,
  levelProgress,
}: {
  name: string;
  avatarUrl: string | null;
  levelProgress: { level: number; currentXp: number; xpPerLevel: number };
}) {
  const pathname = usePathname();
  const pct = Math.round((levelProgress.currentXp / levelProgress.xpPerLevel) * 100);

  return (
    <div className="w-56 shrink-0 space-y-4">
      {/* การ์ดโปรไฟล์ย่อ — Level/XP คำนวณจากแต้มสะสมเดิม (points_ledger) ไม่ใช่ข้อมูลใหม่ */}
      <div className="overflow-hidden rounded-2xl bg-gradient-to-b from-ink to-[#1a2472] p-5 text-center text-paper">
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
            aria-label="แก้ไขโปรไฟล์"
            className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full bg-primary text-ink"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Link>
        </div>
        <p className="mt-3 truncate font-display text-base font-bold">{name}</p>
        <span className="mt-2 inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
          Level {levelProgress.level}
        </span>
        <div className="mt-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/20">
            <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-1 text-right font-mono text-[11px] text-paper/50 tnum">
            {levelProgress.currentXp} / {levelProgress.xpPerLevel} XP
          </p>
        </div>
      </div>

      <nav className="space-y-1">
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
                "flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition",
                active ? "bg-ink text-paper" : "text-ink/60 hover:bg-lane/60",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
