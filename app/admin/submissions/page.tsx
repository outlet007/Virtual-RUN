import Link from "next/link";
import { Footprints, PersonStanding } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, Badge, Button } from "@/components/ui";
import { formatKm } from "@/lib/utils";
import { reviewSubmission } from "@/lib/actions/admin";

export const dynamic = "force-dynamic";

type SubRow = {
  id: string;
  distance_km: number;
  duration_sec: number | null;
  activity_type: string;
  activity_date: string;
  evidence_url: string | null;
  status: string;
  source: string;
  users: { name: string | null; email: string | null } | null;
  registrations: {
    packages: { name: string } | null;
    events: { title: string } | null;
  } | null;
};

const filters = [
  { key: "pending,flagged", label: "รอตรวจ" },
  { key: "approved", label: "อนุมัติแล้ว" },
  { key: "rejected", label: "ปฏิเสธแล้ว" },
  { key: "all", label: "ทั้งหมด" },
];

const statusLabel: Record<string, string> = {
  pending: "รอตรวจ",
  flagged: "ผิดปกติ — รอตรวจ",
  approved: "อนุมัติ",
  rejected: "ปฏิเสธ",
};
const statusClass: Record<string, string> = {
  pending: "bg-medal-soft text-medal",
  flagged: "bg-red-50 text-red-600",
  approved: "bg-primary-soft text-primary-dark",
  rejected: "bg-lane text-muted",
};

export default async function AdminSubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; reviewed?: string }>;
}) {
  const { status, reviewed } = await searchParams;
  const activeFilter = status ?? "pending,flagged";
  const db = createAdminClient();

  let query = db
    .from("submissions")
    .select(
      "id, distance_km, duration_sec, activity_type, activity_date, evidence_url, status, source, users(name, email), registrations(packages(name), events(title))",
    )
    .order("activity_date", { ascending: false });

  if (activeFilter !== "all") {
    query = query.in("status", activeFilter.split(","));
  }

  const { data } = await query;
  const subs = (data ?? []) as unknown as SubRow[];

  // evidence_url เก็บเป็น storage path (bucket private) ต้อง gen signed URL ให้ admin เปิดดูได้
  const evidenceLinks = new Map<string, string>();
  await Promise.all(
    subs
      .filter((s) => s.evidence_url)
      .map(async (s) => {
        const { data: signed } = await db.storage
          .from("run-evidence")
          .createSignedUrl(s.evidence_url!, 600);
        if (signed) evidenceLinks.set(s.id, signed.signedUrl);
      }),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold">ตรวจผลวิ่ง</h2>
        <span className="font-mono text-sm text-ink/40 tnum">{subs.length} รายการ</span>
      </div>

      {reviewed && (
        <div className="rounded-xl bg-primary-soft px-4 py-3 text-sm text-primary-dark">
          {reviewed === "approved" ? "อนุมัติแล้ว" : "ปฏิเสธแล้ว"}
        </div>
      )}

      <div className="flex flex-wrap gap-1 text-sm">
        {filters.map((f) => (
          <Link
            key={f.key}
            href={`/admin/submissions?status=${f.key}`}
            className={`rounded-lg px-3 py-1.5 font-medium ${
              activeFilter === f.key ? "bg-ink text-paper" : "hover:bg-lane/60"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {subs.length === 0 ? (
        <Card className="text-center text-ink/50">ไม่มีรายการ</Card>
      ) : (
        <div className="space-y-3">
          {subs.map((s) => (
            <Card key={s.id} className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-ink/50">
                    {s.registrations?.events?.title} — {s.registrations?.packages?.name}
                  </p>
                  <p className="font-semibold">
                    {s.users?.name || s.users?.email || "ไม่ทราบชื่อ"}
                  </p>
                  <p className="mt-1 inline-flex items-center gap-1 font-mono text-sm tnum">
                    {s.activity_type === "walk" ? (
                      <PersonStanding className="h-4 w-4" />
                    ) : (
                      <Footprints className="h-4 w-4" />
                    )}{" "}
                    {formatKm(Number(s.distance_km))} km
                    {s.duration_sec ? ` · ${Math.round(s.duration_sec / 60)} นาที` : ""}
                    <span className="ml-2 text-ink/40">
                      {new Date(s.activity_date).toLocaleDateString("th-TH")}
                    </span>
                  </p>
                  {evidenceLinks.has(s.id) && (
                    <a
                      href={evidenceLinks.get(s.id)}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-block text-sm text-primary-dark underline"
                    >
                      ดูหลักฐาน →
                    </a>
                  )}
                </div>
                <Badge className={statusClass[s.status]}>{statusLabel[s.status]}</Badge>
              </div>

              {(s.status === "pending" || s.status === "flagged") && (
                <div className="flex gap-2 border-t border-lane pt-3">
                  <form action={reviewSubmission}>
                    <input type="hidden" name="id" value={s.id} />
                    <input type="hidden" name="decision" value="approve" />
                    <Button type="submit">อนุมัติ</Button>
                  </form>
                  <form action={reviewSubmission}>
                    <input type="hidden" name="id" value={s.id} />
                    <input type="hidden" name="decision" value="reject" />
                    <Button variant="ghost" type="submit">
                      ปฏิเสธ
                    </Button>
                  </form>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
