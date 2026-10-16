import Link from "next/link";
import { RotateCcw, Search } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, Badge, Button, HeadingIcon, Input } from "@/components/ui";
import { formatBaht } from "@/lib/utils";
import { confirmPayment, rejectPayment } from "@/lib/actions/admin";

type PaymentRow = {
  id: string;
  amount: number;
  status: string;
  charge_ref: string | null;
  registrations: {
    id: string;
    users: { name: string | null; email: string | null } | null;
    packages: { name: string } | null;
    events: { title: string } | null;
  } | null;
};

const statusLabel: Record<string, string> = {
  pending: "รอตรวจสอบ",
  paid: "ยืนยันแล้ว",
  failed: "ปฏิเสธแล้ว",
};
const statusClass: Record<string, string> = {
  pending: "bg-medal-soft text-medal",
  paid: "bg-primary-soft text-primary-dark",
  failed: "bg-red-100 text-red-700",
};

function normalizeSearchValue(value: unknown) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase("th-TH")
    .trim();
}

export async function EventPaymentsTab({
  eventId,
  searchParams,
}: {
  eventId: string;
  searchParams: { error?: string; payment_confirmed?: string; payment_rejected?: string; payment_q?: string };
}) {
  const { error, payment_confirmed: confirmed, payment_rejected: rejected, payment_q: rawQuery } = searchParams;
  const q = (rawQuery ?? "").trim();
  const db = createAdminClient();

  const { data } = await db
    .from("payments")
    .select(
      "id, amount, status, charge_ref, registrations!inner(id, event_id, users(name, email), packages(name), events(title))",
    )
    .eq("status", "pending")
    .eq("registrations.event_id", eventId)
    .order("id", { ascending: true });

  const paymentRows = (data ?? []) as unknown as PaymentRow[];
  const searchNeedle = normalizeSearchValue(q);
  const payments = searchNeedle
    ? paymentRows.filter((payment) =>
        [
          payment.registrations?.users?.name,
          payment.registrations?.users?.email,
          payment.registrations?.events?.title,
          payment.registrations?.packages?.name,
          payment.amount,
          formatBaht(Number(payment.amount)),
          payment.charge_ref,
          statusLabel[payment.status],
        ].some((value) => normalizeSearchValue(value).includes(searchNeedle)),
      )
    : paymentRows;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-xl font-bold">
          <HeadingIcon name="creditCard" />
          การชำระเงิน
        </h2>
        <span className="font-mono text-sm text-ink/40 tnum">{payments.length} รอตรวจสอบ</span>
      </div>

      {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {confirmed && (
        <div className="rounded-xl bg-primary-soft px-4 py-3 text-sm text-primary-dark">
          ยืนยันการชำระเงินแล้ว
        </div>
      )}
      {rejected && (
        <div className="rounded-xl bg-lane px-4 py-3 text-sm text-muted">
          ปฏิเสธรายการนี้แล้ว
        </div>
      )}

      <Card>
        <form method="get" className="space-y-4">
          <input type="hidden" name="tab" value="payments" />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink/70">
              ค้นหารายการชำระเงิน
            </label>
            <div className="flex items-center gap-2">
              <div className="relative min-w-0 flex-1">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40"
                  aria-hidden="true"
                />
                <Input
                  name="payment_q"
                  defaultValue={q}
                  placeholder="ชื่อผู้ใช้ อีเมล งาน แพ็กเกจ ยอดเงิน หรือเลขอ้างอิง"
                  className="pl-9"
                />
              </div>
              <Button type="submit" className="shrink-0" icon="search">ค้นหา</Button>
            </div>
          </div>
          {q && (
            <div className="flex flex-wrap gap-2">
              <Link
                href={"/admin/events/" + eventId + "?tab=payments"}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-lane px-4 text-sm font-semibold transition hover:bg-lane/50"
              >
                <RotateCcw className="size-4" aria-hidden="true" />

                ล้างการค้นหา
              </Link>
            </div>
          )}
        </form>
      </Card>

      {payments.length === 0 ? (
        <Card className="text-center text-ink/50">
          {q ? "ไม่พบรายการชำระเงินที่ตรงกับการค้นหา" : "ไม่มีรายการรอตรวจสอบ"}
        </Card>
      ) : (
        <div className="space-y-3">
          {payments.map((p) => (
            <Card key={p.id} className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-ink/50">
                    {p.registrations?.events?.title} — {p.registrations?.packages?.name}
                  </p>
                  <p className="font-semibold">
                    {p.registrations?.users?.name || p.registrations?.users?.email || "ไม่ทราบชื่อ"}
                  </p>
                  <p className="mt-1 font-mono text-lg font-bold text-primary-dark tnum">
                    {formatBaht(Number(p.amount))}
                  </p>
                  {p.charge_ref && (
                    <p className="font-mono text-xs text-ink/40 tnum">อ้างอิง {p.charge_ref}</p>
                  )}
                </div>
                <Badge className={statusClass[p.status]}>{statusLabel[p.status]}</Badge>
              </div>

              <div className="flex flex-col gap-2 border-t border-lane pt-3 sm:flex-row">
                <form action={confirmPayment}>
                  <input type="hidden" name="event_id" value={eventId} />
                  <input type="hidden" name="payment_id" value={p.id} />
                  <input type="hidden" name="registration_id" value={p.registrations?.id ?? ""} />
                  <Button type="submit" icon="confirm">ยืนยันการชำระเงิน</Button>
                </form>
                <form action={rejectPayment}>
                  <input type="hidden" name="event_id" value={eventId} />
                  <input type="hidden" name="payment_id" value={p.id} />
                  <input type="hidden" name="registration_id" value={p.registrations?.id ?? ""} />
                  <Button variant="ghost" type="submit" icon="reject">
                    ปฏิเสธ
                  </Button>
                </form>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
