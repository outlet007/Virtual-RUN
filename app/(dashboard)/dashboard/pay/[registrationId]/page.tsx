import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, Badge, HeadingIcon } from "@/components/ui";
import { formatBaht } from "@/lib/utils";
import { generatePromptPayQrDataUrl } from "@/lib/promptpay";

export const dynamic = "force-dynamic";

type RegRow = {
  id: string;
  bib_number: string | null;
  packages: { name: string } | null;
  events: { title: string } | null;
};
type PaymentRow = {
  amount: number;
  status: string;
  charge_ref: string | null;
};

export default async function PayPage({
  params,
}: {
  params: Promise<{ registrationId: string }>;
}) {
  const { registrationId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/dashboard/pay/${registrationId}`);

  const { data: regRaw } = await supabase
    .from("registrations")
    .select("id, bib_number, packages(name), events(title)")
    .eq("id", registrationId)
    .single();

  if (!regRaw) notFound();
  const reg = regRaw as unknown as RegRow;

  const { data: paymentRaw } = await supabase
    .from("payments")
    .select("amount, status, charge_ref")
    .eq("registration_id", registrationId)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!paymentRaw) notFound();
  const payment = paymentRaw as PaymentRow;

  return (
    <div className="mx-auto max-w-md space-y-6">
      <Link href="/dashboard" className="text-sm text-ink/50 hover:text-ink">
        ← แดชบอร์ด
      </Link>

      <div>
        <p className="text-sm text-ink/50">{reg.events?.title}</p>
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold">
          <HeadingIcon name="creditCard" />
          {reg.packages?.name}
        </h1>
      </div>

      {payment.status === "pending" && (
        <Card className="space-y-4 text-center">
          <Badge className="bg-medal-soft text-medal">รอชำระเงิน</Badge>
          <p className="font-mono text-3xl font-bold tnum">
            {formatBaht(Number(payment.amount))}
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={await generatePromptPayQrDataUrl(Number(payment.amount))}
            alt="PromptPay QR Code"
            className="mx-auto h-64 w-64 rounded-xl border border-lane"
          />
          <p className="text-sm text-muted">
            สแกนจ่ายผ่านแอปธนาคารได้เลย — ระบบยังไม่ยืนยันอัตโนมัติ
            แอดมินจะตรวจสอบและยืนยันให้หลังเห็นเงินเข้าจริง
          </p>
          {payment.charge_ref && (
            <p className="font-mono text-xs text-ink/40 tnum">
              อ้างอิง {payment.charge_ref}
            </p>
          )}
        </Card>
      )}

      {payment.status === "paid" && (
        <Card className="space-y-3 text-center">
          <Badge className="bg-primary-soft text-primary-dark">ยืนยันการชำระเงินแล้ว</Badge>
          {reg.bib_number && (
            <p className="font-mono text-2xl font-bold tnum">BIB {reg.bib_number}</p>
          )}
          <p className="text-sm text-muted">เริ่มบันทึกผลวิ่งได้จากแดชบอร์ดเลย</p>
        </Card>
      )}

      {payment.status === "failed" && (
        <Card className="space-y-3 text-center">
          <Badge className="bg-red-50 text-red-600">การชำระเงินถูกปฏิเสธ</Badge>
          <p className="text-sm text-muted">
            ติดต่อผู้จัดงานถ้าคิดว่าเป็นความผิดพลาด
          </p>
        </Card>
      )}
    </div>
  );
}
