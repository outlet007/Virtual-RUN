import Link from "next/link";
import {
  CalendarDays,
  Clock,
  Footprints,
  Pencil,
  PersonStanding,
  RotateCcw,
  Search,
} from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, Badge, Button, HeadingIcon, Input, Select } from "@/components/ui";
import { EvidenceLightbox } from "@/components/admin/evidence-lightbox";
import { formatKm } from "@/lib/utils";
import { reprocessSubmissionOcr, reviewSubmission } from "@/lib/actions/admin";
import { toPublicSupabaseUrl } from "@/lib/supabase/public-url";
import {
  SUBMISSION_FLAG_REASON_LABELS,
  type SubmissionFlagReason,
} from "@/lib/rules";

export const dynamic = "force-dynamic";

type SubRow = {
  id: string;
  distance_km: number;
  duration_sec: number | null;
  activity_type: string;
  activity_date: string;
  evidence_url: string | null;
  ocr_status: string;
  ocr_distance_km: number | null;
  ocr_confidence: number | null;
  duplicate_match_type: "exact" | "normalized" | "perceptual" | null;
  duplicate_match_submission_id: string | null;
  duplicate_similarity_distance: number | null;
  flag_reason: SubmissionFlagReason[];
  status: string;
  source: string;
  users: { name: string | null; email: string | null } | null;
  registrations: {
    packages: { name: string } | null;
    events: { title: string } | null;
  } | null;
};

type DuplicateReference = {
  id: string;
  activity_date: string;
  users: { name: string | null; email: string | null } | null;
  registrations: { events: { title: string } | null } | null;
};

const filters = [
  { key: "pending,flagged", label: "รอตรวจ" },
  { key: "approved", label: "อนุมัติแล้ว" },
  { key: "rejected", label: "ปฏิเสธแล้ว" },
  { key: "all", label: "ทั้งหมด" },
];

const statusOptions = [
  { key: "all", label: "ทุกสถานะ" },
  { key: "pending,flagged", label: "รอตรวจทั้งหมด" },
  { key: "pending", label: "รอตรวจปกติ" },
  { key: "flagged", label: "ผิดปกติ — รอตรวจ" },
  { key: "approved", label: "อนุมัติแล้ว" },
  { key: "rejected", label: "ปฏิเสธแล้ว" },
] as const;

const activityOptions = [
  { key: "all", label: "ทุกประเภทกิจกรรม" },
  { key: "run", label: "วิ่ง" },
  { key: "walk", label: "เดิน" },
] as const;

const ocrOptions = [
  { key: "all", label: "ทุกผล OCR" },
  { key: "matched", label: "ระยะตรงกัน" },
  { key: "mismatch", label: "ระยะไม่ตรงกัน" },
  { key: "unreadable", label: "อ่านระยะไม่ได้" },
  { key: "not_processed", label: "ยังไม่ได้ตรวจ OCR" },
  { key: "error", label: "OCR ไม่สำเร็จ" },
] as const;

const statusLabel: Record<string, string> = {
  pending: "รอตรวจ",
  flagged: "ผิดปกติ — รอตรวจ",
  approved: "อนุมัติ",
  rejected: "ปฏิเสธ",
};
const statusClass: Record<string, string> = {
  pending: "bg-medal-soft text-medal",
  flagged: "bg-red-50 text-red-600",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
};

const ocrStatusLabel: Record<string, string> = {
  not_processed: "ไม่ได้ตรวจ OCR",
  matched: "ระยะตรงกัน",
  mismatch: "ระยะไม่ตรงกัน",
  unreadable: "อ่านระยะไม่ได้",
  error: "OCR ประมวลผลไม่สำเร็จ",
};
const duplicateMatchLabel: Record<string, string> = {
  exact: "ไฟล์ตรงกันทั้งหมด",
  normalized: "ภาพหลัง normalize ตรงกัน",
  perceptual: "ภาพมีลักษณะใกล้เคียงกัน",
};

function formatDuration(totalSeconds: number) {
  const duration = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(duration / 3600);
  const minutes = Math.floor((duration % 3600) / 60);
  const seconds = duration % 60;
  const parts: string[] = [];

  if (hours > 0) parts.push(`${hours} ชั่วโมง`);
  if (minutes > 0 || hours > 0) parts.push(`${minutes} นาที`);
  parts.push(`${seconds} วินาที`);

  return parts.join(" ");
}

function normalizeSearchValue(value: unknown) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase("th-TH")
    .trim();
}

function submissionsHref(
  status: string,
  q: string,
  activity: string,
  ocr: string,
) {
  const params = new URLSearchParams({ status });
  if (q) params.set("q", q);
  if (activity !== "all") params.set("activity", activity);
  if (ocr !== "all") params.set("ocr", ocr);
  return `/admin/submissions?${params.toString()}`;
}

export default async function AdminSubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    reviewed?: string;
    ocr_reprocessed?: string;
    q?: string;
    activity?: string;
    ocr?: string;
  }>;
}) {
  const {
    status,
    reviewed,
    ocr_reprocessed,
    q: rawQuery,
    activity,
    ocr,
  } = await searchParams;
  const q = (rawQuery ?? "").trim();
  const requestedStatus = statusOptions.some((option) => option.key === status)
    ? status
    : undefined;
  const activeFilter = requestedStatus ?? (q ? "all" : "pending,flagged");
  const searchStatus = requestedStatus ?? "all";
  const activeActivity = activityOptions.some((option) => option.key === activity)
    ? activity!
    : "all";
  const activeOcr = ocrOptions.some((option) => option.key === ocr) ? ocr! : "all";
  const db = createAdminClient();

  let query = db
    .from("submissions")
    .select(
      "id, distance_km, duration_sec, activity_type, activity_date, evidence_url, ocr_status, ocr_distance_km, ocr_confidence, duplicate_match_type, duplicate_match_submission_id, duplicate_similarity_distance, flag_reason, status, source, users(name, email), registrations(packages(name), events(title))",
    )
    .order("activity_date", { ascending: false });

  if (activeFilter !== "all") {
    query = query.in("status", activeFilter.split(","));
  }
  if (activeActivity !== "all") {
    query = query.eq("activity_type", activeActivity);
  }
  if (activeOcr !== "all") {
    query = query.eq("ocr_status", activeOcr);
  }

  const { data } = await query;
  const rows = (data ?? []) as unknown as SubRow[];
  const searchNeedle = normalizeSearchValue(q);
  const subs = searchNeedle
    ? rows.filter((submission) =>
        [
          submission.users?.name,
          submission.users?.email,
          submission.registrations?.events?.title,
          submission.registrations?.packages?.name,
          submission.id,
          submission.activity_type,
          submission.status,
          statusLabel[submission.status],
          ...submission.flag_reason.map((reason) => SUBMISSION_FLAG_REASON_LABELS[reason]),
          submission.distance_km,
          formatKm(Number(submission.distance_km)),
          new Date(submission.activity_date).toLocaleDateString("th-TH"),
        ].some((value) => normalizeSearchValue(value).includes(searchNeedle)),
      )
    : rows;

  // evidence_url เก็บเป็น storage path (bucket private) ต้อง gen signed URL ให้ admin เปิดดูได้
  const evidenceLinks = new Map<string, string>();
  await Promise.all(
    subs
      .filter((s) => s.evidence_url)
      .map(async (s) => {
        const { data: signed } = await db.storage
          .from("run-evidence")
          .createSignedUrl(s.evidence_url!, 600);
        if (signed) evidenceLinks.set(s.id, toPublicSupabaseUrl(signed.signedUrl));
      }),
  );

  const duplicateReferenceIds = Array.from(
    new Set(
      subs
        .map((submission) => submission.duplicate_match_submission_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );
  const duplicateReferences = new Map<string, DuplicateReference>();
  if (duplicateReferenceIds.length > 0) {
    const { data: references } = await db
      .from("submissions")
      .select("id, activity_date, users(name, email), registrations(events(title))")
      .in("id", duplicateReferenceIds);
    for (const reference of (references ?? []) as unknown as DuplicateReference[]) {
      duplicateReferences.set(reference.id, reference);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-xl font-bold">
          <HeadingIcon name="submission" />
          ตรวจผลวิ่ง
        </h2>
        <span className="font-mono text-sm text-ink/40 tnum">{subs.length} รายการ</span>
      </div>

      {reviewed && (
        <div className="rounded-xl bg-primary-soft px-4 py-3 text-sm text-primary-dark">
          อัปเดตสถานะผลตรวจแล้ว: {statusLabel[reviewed] ?? reviewed}
        </div>
      )}

      {ocr_reprocessed && (
        <div className="rounded-xl bg-primary-soft px-4 py-3 text-sm text-primary-dark">
          ตรวจ OCR ใหม่แล้ว: {ocrStatusLabel[ocr_reprocessed] ?? ocr_reprocessed}
        </div>
      )}

      <Card>
        <form method="get" className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink/70">
              ค้นหารายการผลวิ่ง
            </label>
            <div className="flex items-center gap-2">
              <div className="relative min-w-0 flex-1">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40"
                  aria-hidden="true"
                />
                <Input
                  name="q"
                  defaultValue={q}
                  placeholder="ชื่อผู้ใช้ อีเมล ชื่องาน แพ็กเกจ หรือระยะทาง"
                  className="pl-9"
                />
              </div>
              <Button type="submit" className="shrink-0" icon="search">ค้นหา</Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink/70">
                สถานะผลตรวจ
              </label>
              <Select name="status" defaultValue={searchStatus}>
                {statusOptions.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink/70">
                ประเภทกิจกรรม
              </label>
              <Select name="activity" defaultValue={activeActivity}>
                {activityOptions.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink/70">
                ผลการตรวจ OCR
              </label>
              <Select name="ocr" defaultValue={activeOcr}>
                {ocrOptions.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {(q || searchStatus !== "all" || activeActivity !== "all" || activeOcr !== "all") && (
            <div className="flex flex-wrap gap-2">
              <Link
                href="/admin/submissions?status=all"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-lane px-4 text-sm font-semibold transition hover:bg-lane/50"
              >
                <RotateCcw className="size-4" aria-hidden="true" />

                ล้างการค้นหาและตัวกรอง
              </Link>
            </div>
          )}
        </form>
      </Card>

      <div className="flex flex-wrap gap-1 text-sm">
        {filters.map((f) => (
          <Link
            key={f.key}
            href={submissionsHref(f.key, q, activeActivity, activeOcr)}
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
              <div className="grid gap-4 md:grid-cols-2">
                <div className="min-w-0">
                  <p className="text-sm text-ink/50">
                    {s.registrations?.events?.title} — {s.registrations?.packages?.name}
                  </p>
                  <p className="font-semibold">
                    {s.users?.name || s.users?.email || "ไม่ทราบชื่อ"}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-sm tnum">
                    <span className="inline-flex items-center gap-1.5">
                      {s.activity_type === "walk" ? (
                        <PersonStanding className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <Footprints className="h-4 w-4" aria-hidden="true" />
                      )}
                      {formatKm(Number(s.distance_km))} km
                    </span>
                    {s.duration_sec !== null && (
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="h-4 w-4 text-ink/50" aria-hidden="true" />
                        {formatDuration(s.duration_sec)}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5 text-ink/50">
                      <CalendarDays className="h-4 w-4" aria-hidden="true" />
                      {new Date(s.activity_date).toLocaleDateString("th-TH")}
                    </span>
                  </div>
                  {evidenceLinks.has(s.id) && (
                    <EvidenceLightbox
                      src={evidenceLinks.get(s.id)!}
                      alt={`หลักฐานผลวิ่งของ ${s.users?.name || s.users?.email || "ผู้เข้าร่วม"}`}
                    />
                  )}
                </div>

                <div className="flex min-w-0 flex-col gap-3 md:items-end">
                  <Badge className={statusClass[s.status]}>{statusLabel[s.status]}</Badge>
                  {s.source === "upload" && (
                    <div
                      className={`w-full rounded-xl px-3 py-2 text-sm ${
                        s.ocr_status === "matched"
                          ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "bg-red-50 text-red-700"
                      }`}
                    >
                      <p className="font-semibold">
                        OCR: {ocrStatusLabel[s.ocr_status] ?? s.ocr_status}
                      </p>
                      {s.ocr_distance_km !== null && (
                        <p className="mt-0.5">
                          อ่านได้ {formatKm(Number(s.ocr_distance_km))} km
                          {s.ocr_confidence !== null
                            ? ` · ความมั่นใจ ${Math.round(Number(s.ocr_confidence))}%`
                            : ""}
                          {" · "}ผู้ใช้กรอก {formatKm(Number(s.distance_km))} km
                        </p>
                      )}
                      <form action={reprocessSubmissionOcr} className="mt-2">
                        <input type="hidden" name="id" value={s.id} />
                        <Button
                          type="submit"
                          variant="ghost"
                          className="h-9 border-current px-3 text-xs"
                          icon="refresh">
                          ตรวจ OCR ใหม่
                        </Button>
                      </form>
                    </div>
                  )}
                  {s.flag_reason.length > 0 && (
                    <div className="w-full rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                      <p className="font-semibold">เหตุผลจาก Rule Engine</p>
                      <ul className="mt-1 list-disc space-y-1 pl-5">
                        {s.flag_reason.map((reason) => (
                          <li key={reason}>
                            {SUBMISSION_FLAG_REASON_LABELS[reason] ?? reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {s.duplicate_match_type && (
                    <div className="w-full rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                      <p className="font-semibold">ตรวจพบหลักฐานที่อาจซ้ำ</p>
                      <p className="mt-0.5">
                        {duplicateMatchLabel[s.duplicate_match_type] ?? s.duplicate_match_type}
                        {s.duplicate_similarity_distance !== null && (
                          <>
                            {" · "}ระยะห่าง {s.duplicate_similarity_distance}/64
                            {" · "}ความคล้ายประมาณ{" "}
                            {Math.round(
                              (1 - Number(s.duplicate_similarity_distance) / 64) * 100,
                            )}
                            %
                          </>
                        )}
                      </p>
                      {s.duplicate_match_submission_id &&
                        duplicateReferences.has(s.duplicate_match_submission_id) && (
                        <div className="mt-2 rounded-lg bg-white/70 px-2.5 py-2 text-xs text-ink/65">
                          <p className="font-semibold text-ink/80">รายการอ้างอิงสำหรับ Admin</p>
                          <p>
                            {duplicateReferences.get(s.duplicate_match_submission_id)?.users?.name ||
                              duplicateReferences.get(s.duplicate_match_submission_id)?.users?.email ||
                              "ไม่ทราบชื่อ"}
                            {" · "}
                            {duplicateReferences.get(s.duplicate_match_submission_id)?.registrations
                              ?.events?.title || "ไม่ทราบชื่องาน"}
                            {" · "}
                            {new Date(
                              duplicateReferences.get(s.duplicate_match_submission_id)!.activity_date,
                            ).toLocaleDateString("th-TH")}
                          </p>
                          <p className="mt-0.5 font-mono text-[11px] text-ink/40">
                            Submission: {s.duplicate_match_submission_id}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <details className="border-t border-lane pt-3">
                <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-semibold text-ink/60 transition hover:bg-lane/50 hover:text-ink">
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                  แก้ไขผลตรวจ
                </summary>
                <form
                  action={reviewSubmission}
                  className="mt-3 flex flex-col gap-3 rounded-xl bg-lane/30 p-3 sm:flex-row sm:items-end"
                >
                  <input type="hidden" name="id" value={s.id} />
                  <div className="w-full sm:max-w-xs">
                    <label className="mb-1.5 block text-sm font-medium text-ink/70">
                      สถานะผลตรวจ
                    </label>
                    <Select
                      name="decision"
                      defaultValue={
                        s.status === "approved"
                          ? "approve"
                          : s.status === "rejected"
                            ? "reject"
                            : "pending"
                      }
                    >
                      <option value="pending">รอตรวจ</option>
                      <option value="approve">อนุมัติแล้ว</option>
                      <option value="reject">ปฏิเสธแล้ว</option>
                    </Select>
                  </div>
                  <Button type="submit" icon="save">บันทึกสถานะ</Button>
                </form>
              </details>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
