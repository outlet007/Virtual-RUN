import { createAdminClient } from "@/lib/supabase/admin";
import { Card, Badge, Button } from "@/components/ui";
import { formatBaht } from "@/lib/utils";
import { confirmPayment, rejectPayment } from "@/lib/actions/admin";

export const dynamic = "force-dynamic";

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
  failed: "bg-lane text-ink/60",
};

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ confirmed?: string; rejected?: string }>;
}) {
  const { confirmed, rejected } = await searchParams;
  const db = createAdminClient();

  const { data } = await db
    .from("payments")
    .select(
      "id, amount, status, charge_ref, registrations(id, users(name, email), packages(name), events(title))",
    )
    .eq("status", "pending")
    .order("id", { ascending: true });

  const payments = (data ?? []) as unknown as PaymentRow[];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold">การชำระเงิน</h2>
        <span className="font-mono text-sm text-ink/40 tnum">{payments.length} รอตรวจสอบ</span>
      </div>

      {confirmed && (
        <div className="rounded-xl bg-primary-soft px-4 py-3 text-sm text-primary-dark">
          ยืนยันการชำระเงินแล้ว
        </div>
      )}
      {rejected && (
        <div className="rounded-xl bg-lane px-4 py-3 text-sm text-ink/60">
          ปฏิเสธรายการนี้แล้ว
        </div>
      )}

      {payments.length === 0 ? (
        <Card className="text-center text-ink/50">ไม่มีรายการรอตรวจสอบ</Card>
      ) : (
        <div className="space-y-3">
          {payments.map((p) => (
            <Card key={p.id} className="space-y-3">
              <div className="flex items-start justify-between gap-3">
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

              <div className="flex gap-2 border-t border-lane pt-3">
                <form action={confirmPayment}>
                  <input type="hidden" name="payment_id" value={p.id} />
                  <input type="hidden" name="registration_id" value={p.registrations?.id ?? ""} />
                  <Button type="submit">ยืนยันการชำระเงิน</Button>
                </form>
                <form action={rejectPayment}>
                  <input type="hidden" name="payment_id" value={p.id} />
                  <input type="hidden" name="registration_id" value={p.registrations?.id ?? ""} />
                  <Button variant="ghost" type="submit">
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
