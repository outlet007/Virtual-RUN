import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, Button, Input, Label, Badge } from "@/components/ui";
import { registerForEvent } from "@/lib/actions/registration";
import { formatBaht } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function RegisterPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ package?: string }>;
}) {
  const { id } = await params;
  const { package: packageId } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/events/${id}`);

  if (!packageId) notFound();
  const { data: pkg } = await supabase
    .from("packages")
    .select("id, name, target_distance_km, price, has_physical_medal, events(title)")
    .eq("id", packageId)
    .single();

  if (!pkg) notFound();
  // relation อาจกลับมาเป็น object หรือ array แล้วแต่กรณี
  const ev = pkg.events as unknown as
    | { title: string }
    | { title: string }[]
    | null;
  const eventTitle = (Array.isArray(ev) ? ev[0]?.title : ev?.title) ?? "";
  const isFree = Number(pkg.price) === 0;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="font-display text-2xl font-bold">ยืนยันการสมัคร</h1>

      <Card className="space-y-1 bg-ink text-paper">
        <p className="text-sm text-paper/60">{eventTitle}</p>
        <div className="flex items-center gap-2">
          <span className="font-display text-xl font-bold">{pkg.name}</span>
          {pkg.has_physical_medal && (
            <Badge className="bg-medal/20 text-medal">🏅 เหรียญจริง</Badge>
          )}
        </div>
        <div className="font-mono text-sm text-primary tnum">
          {pkg.target_distance_km} km ·{" "}
          {isFree ? "ฟรี" : formatBaht(Number(pkg.price))}
        </div>
      </Card>

      <form action={registerForEvent} className="space-y-4">
        <input type="hidden" name="package_id" value={pkg.id} />

        {pkg.has_physical_medal && (
          <Card className="space-y-3">
            <p className="text-sm font-semibold">
              ที่อยู่สำหรับจัดส่งเหรียญ
            </p>
            <div>
              <Label>ชื่อผู้รับ</Label>
              <Input name="recipient" required />
            </div>
            <div>
              <Label>เบอร์โทร</Label>
              <Input name="phone" required />
            </div>
            <div>
              <Label>ที่อยู่</Label>
              <Input name="address" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>จังหวัด</Label>
                <Input name="province" required />
              </div>
              <div>
                <Label>รหัสไปรษณีย์</Label>
                <Input name="postal_code" inputMode="numeric" required />
              </div>
            </div>
          </Card>
        )}

        {!isFree && (
          <div className="rounded-xl bg-medal-soft px-4 py-3 text-sm text-medal">
            งานนี้มีค่าสมัคร — ระบบชำระเงิน PromptPay จะเปิดใน Phase 4
            ตอนนี้จะบันทึกเป็น &quot;รอชำระเงิน&quot;
          </div>
        )}

        <Button className="w-full" type="submit">
          {isFree ? "ยืนยันสมัคร (รับ BIB)" : "สมัคร (รอชำระเงิน)"}
        </Button>
      </form>
    </div>
  );
}
