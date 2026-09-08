import { Button, Card, HeadingIcon, Input, Label, Select } from "@/components/ui";
import {
  runEvidenceCleanupAction,
  updateEventEvidenceRetention,
  updateEvidenceRetentionSettings,
} from "@/lib/actions/evidence-retention";
import { formatEvidenceBytes, getBangkokIsoDate } from "@/lib/evidence-retention";
import { requireSuperAdmin } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type EventSummary = {
  event_id: string;
  event_title: string;
  event_title_en: string | null;
  event_end_date: string;
  event_retention_days: number | null;
  retention_days: number | string;
  eligible: boolean;
  evidence_files: number | string;
  evidence_bytes: number | string;
};

type CleanupRun = {
  id: number;
  source: "manual" | "cron";
  deleted_files: number;
  reclaimed_bytes: number | string;
  failed_files: number;
  failure_summary: string | null;
  created_at: string;
};

function numberValue(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default async function AdminStoragePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireSuperAdmin();
  const sp = await searchParams;
  const db = createAdminClient();
  const settingsResult = await db
    .from("system_settings")
    .select("evidence_retention_enabled, evidence_retention_days")
    .eq("id", 1)
    .maybeSingle();
  const [summaryResult, runsResult] = await Promise.all([
    db.rpc("get_evidence_retention_summary", { p_today: getBangkokIsoDate() }),
    db
      .from("evidence_cleanup_runs")
      .select("id, source, deleted_files, reclaimed_bytes, failed_files, failure_summary, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const available = !settingsResult.error && !summaryResult.error && !runsResult.error;
  const settings = settingsResult.data ?? {
    evidence_retention_enabled: false,
    evidence_retention_days: 180,
  };
  const events = (summaryResult.data ?? []) as EventSummary[];
  const runs = (runsResult.data ?? []) as CleanupRun[];
  const eligibleEvents = events.filter(
    (event) => event.eligible && numberValue(event.evidence_files) > 0,
  );
  const eligibleFiles = eligibleEvents.reduce(
    (total, event) => total + numberValue(event.evidence_files),
    0,
  );
  const eligibleBytes = eligibleEvents.reduce(
    (total, event) => total + numberValue(event.evidence_bytes),
    0,
  );

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h2 className="flex items-center gap-2 font-display text-xl font-bold">
          <HeadingIcon name="history" />
          การจัดเก็บหลักฐานการวิ่ง
        </h2>
        <p className="mt-1 text-sm text-muted">
          ลบเฉพาะไฟล์หลักฐานหลังพ้นระยะเก็บ โดยคงผลวิ่ง สถานะ OCR และ fingerprint ไว้
        </p>
      </div>

      {sp.error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{sp.error}</div>}
      {(sp.saved || sp.event_saved) && (
        <div className="rounded-xl bg-primary-soft px-4 py-3 text-sm text-primary-dark">
          บันทึกนโยบายการจัดเก็บแล้ว
        </div>
      )}
      {sp.deleted !== undefined && (
        <div className="rounded-xl bg-primary-soft px-4 py-3 text-sm text-primary-dark">
          ลบหลักฐานแล้ว {sp.deleted} ไฟล์ คืนพื้นที่ประมาณ {formatEvidenceBytes(numberValue(sp.reclaimed))}
        </div>
      )}
      {sp.disabled && (
        <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          ระบบลบอัตโนมัติถูกปิด จึงไม่มีไฟล์ถูกลบ
        </div>
      )}
      {!available && (
        <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          ยังไม่พร้อมใช้งาน กรุณาใช้ migration ล่าสุดก่อนเปิดระบบจัดเก็บหลักฐาน
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <p className="text-sm text-muted">ไฟล์ที่พร้อมลบขณะนี้</p>
          <p className="mt-2 font-display text-3xl font-bold">{eligibleFiles.toLocaleString("th-TH")}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">พื้นที่โดยประมาณที่คืนได้</p>
          <p className="mt-2 font-display text-3xl font-bold">{formatEvidenceBytes(eligibleBytes)}</p>
        </Card>
      </div>

      <form action={updateEvidenceRetentionSettings}>
        <Card className="space-y-4">
          <h3 className="font-display font-bold">นโยบายหลักของระบบ</h3>
          <label className="flex items-start gap-2 text-sm font-medium">
            <input
              type="checkbox"
              name="retention_enabled"
              defaultChecked={settings.evidence_retention_enabled}
              className="mt-0.5 h-4 w-4 rounded border-lane accent-ink"
            />
            เปิดใช้งานการลบหลักฐานหลังพ้นระยะเก็บ
          </label>
          <div>
            <Label htmlFor="retention-days">จำนวนวันเริ่มต้นหลังจบกิจกรรม</Label>
            <Input
              id="retention-days"
              name="retention_days"
              type="number"
              min={30}
              max={3650}
              defaultValue={settings.evidence_retention_days}
              required
            />
            <p className="mt-1 text-xs text-ink/50">กำหนดได้ 30–3,650 วัน แนะนำ 180 วัน</p>
          </div>
          <Button type="submit" icon="save" disabled={!available}>บันทึกนโยบายหลัก</Button>
        </Card>
      </form>

      <Card className="space-y-4">
        <div>
          <h3 className="font-display font-bold">กำหนดแยกรายกิจกรรม</h3>
          <p className="mt-1 text-sm text-muted">
            เว้นว่างเพื่อใช้ค่าระบบ ใส่ 0 เพื่อเก็บถาวร หรือกำหนด 30–3,650 วัน
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-lane text-xs uppercase tracking-wide text-muted">
                <th className="px-3 py-2">กิจกรรม</th>
                <th className="px-3 py-2">วันจบ</th>
                <th className="px-3 py-2">ไฟล์/พื้นที่</th>
                <th className="px-3 py-2">Retention</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.event_id} className="border-b border-lane/70 align-top">
                  <td className="px-3 py-3 font-medium">
                    {event.event_title}
                    {event.eligible && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">พร้อมลบ</span>}
                  </td>
                  <td className="px-3 py-3">{new Date(`${event.event_end_date}T00:00:00+07:00`).toLocaleDateString("th-TH")}</td>
                  <td className="px-3 py-3">
                    {numberValue(event.evidence_files).toLocaleString("th-TH")} ไฟล์<br />
                    <span className="text-xs text-muted">{formatEvidenceBytes(numberValue(event.evidence_bytes))}</span>
                  </td>
                  <td className="px-3 py-3">
                    <form action={updateEventEvidenceRetention} className="flex items-end gap-2">
                      <input type="hidden" name="event_id" value={event.event_id} />
                      <Input
                        name="event_retention_days"
                        type="number"
                        min={0}
                        max={3650}
                        defaultValue={event.event_retention_days ?? ""}
                        className="w-28"
                        aria-label={`จำนวนวันเก็บหลักฐานของ ${event.event_title}`}
                      />
                      <Button type="submit" variant="ghost" className="min-h-10 px-3" disabled={!available}>บันทึก</Button>
                    </form>
                    <p className="mt-1 text-xs text-muted">
                      ใช้งานจริง {numberValue(event.retention_days).toLocaleString("th-TH")} วัน
                    </p>
                  </td>
                </tr>
              ))}
              {events.length === 0 && (
                <tr><td colSpan={4} className="px-3 py-8 text-center text-muted">ยังไม่มีกิจกรรมที่จบแล้ว</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <form action={runEvidenceCleanupAction}>
        <Card className="space-y-4 border-red-200">
          <div>
            <h3 className="font-display font-bold text-red-800">ลบหลักฐานที่พ้นระยะเก็บ</h3>
            <p className="mt-1 text-sm text-red-700">
              ไฟล์จะถูกลบถาวร แต่ผลวิ่งและข้อมูลตรวจสอบยังคงอยู่ ระบบลบสูงสุด 500 ไฟล์ต่อครั้ง
            </p>
          </div>
          <div>
            <Label htmlFor="cleanup-event">ขอบเขตการลบ</Label>
            <Select id="cleanup-event" name="event_id" defaultValue="">
              <option value="">ทุกกิจกรรมที่พร้อมลบ</option>
              {eligibleEvents.map((event) => (
                <option key={event.event_id} value={event.event_id}>{event.event_title}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="cleanup-confirmation">พิมพ์ DELETE เพื่อยืนยัน</Label>
            <Input id="cleanup-confirmation" name="confirmation" autoComplete="off" required />
          </div>
          <Button type="submit" icon="delete" variant="ink" disabled={!available || eligibleFiles === 0}>
            ลบไฟล์หลักฐานที่พร้อมลบ
          </Button>
        </Card>
      </form>

      <Card className="space-y-3">
        <h3 className="font-display font-bold">ประวัติการลบล่าสุด</h3>
        <div className="space-y-2 text-sm">
          {runs.map((run) => (
            <div key={run.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-lane/40 px-3 py-2">
              <span>{run.source === "cron" ? "Cron" : "Super Admin"} · {new Date(run.created_at).toLocaleString("th-TH")}</span>
              <span className={run.failed_files > 0 ? "text-red-700" : "text-primary-dark"}>
                ลบ {run.deleted_files} ไฟล์ · {formatEvidenceBytes(numberValue(run.reclaimed_bytes))}
              </span>
              {run.failure_summary && (
                <span className="w-full text-xs text-red-700">ผิดพลาด: {run.failure_summary}</span>
              )}
            </div>
          ))}
          {runs.length === 0 && <p className="text-muted">ยังไม่มีประวัติการลบ</p>}
        </div>
      </Card>
    </div>
  );
}
