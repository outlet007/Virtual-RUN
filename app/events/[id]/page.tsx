import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, Badge, LinkButton } from "@/components/ui";
import { formatBaht } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function EventDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select(
      "id, title, description, pricing, start_date, end_date, packages(id, name, target_distance_km, price, has_physical_medal)",
    )
    .eq("id", id)
    .single();

  if (!event) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/" className="text-sm text-ink/50 hover:text-ink">
        ← งานทั้งหมด
      </Link>

      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div>
        <Badge
          className={
            event.pricing === "free"
              ? "bg-primary-soft text-primary-dark"
              : "bg-medal-soft text-medal"
          }
        >
          {event.pricing === "free" ? "ฟรี" : "มีค่าสมัคร"}
        </Badge>
        <h1 className="mt-3 font-display text-3xl font-bold">{event.title}</h1>
        <p className="mt-2 text-ink/60">{event.description}</p>
        <p className="mt-3 font-mono text-sm text-ink/45 tnum">
          {event.start_date} → {event.end_date}
        </p>
      </div>

      <div className="space-y-3">
        <h2 className="font-display text-xl font-bold">เลือกแพ็กเกจ</h2>
        {event.packages.map((p) => (
          <Card key={p.id} className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-bold">{p.name}</span>
                {p.has_physical_medal && (
                  <Badge className="bg-medal-soft text-medal">🏅 เหรียญจริง</Badge>
                )}
              </div>
              <div className="mt-1 font-mono text-sm text-ink/50">
                <span className="tnum">{p.target_distance_km} km</span>
                <span className="mx-2 text-ink/25">·</span>
                {Number(p.price) === 0 ? "ฟรี" : formatBaht(Number(p.price))}
              </div>
            </div>
            {user ? (
              <LinkButton href={`/events/${event.id}/register?package=${p.id}`}>
                สมัคร
              </LinkButton>
            ) : (
              <LinkButton
                href={`/login?next=/events/${event.id}`}
                variant="ghost"
              >
                เข้าสู่ระบบเพื่อสมัคร
              </LinkButton>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
