import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, Badge, LinkButton } from "@/components/ui";
import { formatBaht } from "@/lib/utils";

export const dynamic = "force-dynamic";

type PackageRow = {
  id: string;
  name: string;
  target_distance_km: number;
  price: number;
  has_physical_medal: boolean;
};
type EventRow = {
  id: string;
  title: string;
  description: string | null;
  pricing: "free" | "paid";
  start_date: string;
  end_date: string;
  packages: PackageRow[];
};

export default async function HomePage() {
  const supabase = await createClient();
  const { data: events } = await supabase
    .from("events")
    .select(
      "id, title, description, pricing, start_date, end_date, packages(id, name, target_distance_km, price, has_physical_medal)",
    )
    .eq("status", "open")
    .order("start_date", { ascending: true });

  const list = (events ?? []) as EventRow[];

  return (
    <div className="space-y-12">
      {/* Hero — thesis: ระยะทางคือหัวใจ */}
      <section className="pt-4">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary-dark">
          Run · Walk · Collect
        </p>
        <h1 className="mt-3 max-w-2xl font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
          วิ่งที่ไหน เมื่อไหร่ก็ได้
          <br />
          <span className="text-primary">เก็บทุกกิโลเมตร</span> ให้เป็นเหรียญ
        </h1>
        <p className="mt-4 max-w-xl text-ink/60">
          สมัครงาน เชื่อม Strava หรืออัปโหลดผลเอง ระบบรวมระยะให้อัตโนมัติ
          ครบเป้าเมื่อไหร่ ปลดล็อกเหรียญเมื่อนั้น
        </p>
        <div className="mt-6 flex gap-3">
          <LinkButton href="#events" variant="ink">
            ดูงานวิ่งทั้งหมด
          </LinkButton>
          <LinkButton href="/signup" variant="ghost">
            สมัครสมาชิก
          </LinkButton>
        </div>
      </section>

      {/* Events */}
      <section id="events" className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-2xl font-bold">งานที่เปิดรับสมัคร</h2>
          <span className="font-mono text-sm text-ink/40 tnum">
            {list.length} งาน
          </span>
        </div>

        {list.length === 0 ? (
          <Card className="text-center text-ink/50">
            ยังไม่มีงานที่เปิดรับสมัคร — รัน seed.sql เพื่อเพิ่มงานตัวอย่าง
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {list.map((ev) => {
              const minKm = Math.min(...ev.packages.map((p) => p.target_distance_km));
              const maxKm = Math.max(...ev.packages.map((p) => p.target_distance_km));
              return (
                <Card key={ev.id} className="flex flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-display text-lg font-bold">{ev.title}</h3>
                    <Badge
                      className={
                        ev.pricing === "free"
                          ? "bg-primary-soft text-primary-dark"
                          : "bg-medal-soft text-medal"
                      }
                    >
                      {ev.pricing === "free" ? "ฟรี" : "มีค่าสมัคร"}
                    </Badge>
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-sm text-ink/55">
                    {ev.description}
                  </p>
                  <div className="mt-4 flex items-center gap-4 font-mono text-sm">
                    <span className="tnum">
                      {minKm === maxKm ? `${minKm}` : `${minKm}–${maxKm}`}
                      <span className="text-ink/40"> km</span>
                    </span>
                    <span className="text-ink/30">·</span>
                    <span className="text-ink/50">
                      {ev.packages.length} แพ็กเกจ
                    </span>
                  </div>
                  <div className="mt-4 border-t border-lane pt-4">
                    <Link
                      href={`/events/${ev.id}`}
                      className="text-sm font-semibold text-primary-dark hover:underline"
                    >
                      ดูรายละเอียด →
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
