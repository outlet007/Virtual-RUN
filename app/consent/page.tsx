import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, Button } from "@/components/ui";
import { acceptConsent } from "@/lib/actions/auth";

export const dynamic = "force-dynamic";

export default async function ConsentPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: consent } = await supabase
    .from("consents")
    .select("id")
    .eq("user_id", user.id)
    .eq("type", "privacy")
    .maybeSingle();
  if (consent) redirect("/dashboard");

  return (
    <div className="mx-auto max-w-lg space-y-6 pt-8">
      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <form action={acceptConsent}>
        <Card className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🛡️</span>
            <h1 className="font-display text-lg font-bold">การยินยอมเปิดเผยข้อมูล *</h1>
          </div>

          <p className="text-sm leading-relaxed text-ink/70">
            ข้าพเจ้าตกลงและยินยอมให้ Virtual RUN เก็บรวบรวม ใช้ ประมวลผล
            และเปิดเผยข้อมูลส่วนบุคคลของข้าพเจ้า เพื่อวัตถุประสงค์ในการลงทะเบียนเข้าร่วมกิจกรรมวิ่ง
            บันทึกและตรวจสอบผลการวิ่ง จัดส่งเหรียญ/ของรางวัล
            และติดต่อสื่อสารที่เกี่ยวข้องกับการเข้าร่วมกิจกรรม ทั้งนี้เป็นไปตามนโยบายคุ้มครองข้อมูลส่วนบุคคลของ
            Virtual RUN โดยรายละเอียดปรากฏตามนโยบายคุ้มครองข้อมูลส่วนบุคคลในเว็บไซต์
          </p>

          <label className="flex items-start gap-2 border-t border-lane pt-4 text-sm text-ink/70">
            <input type="checkbox" name="accept" className="mt-1" required />
            <span>ข้าพเจ้าได้อ่านและยอมรับการยินยอมเปิดเผยข้อมูลแล้ว</span>
          </label>

          <Button className="w-full" type="submit">
            ยืนยัน
          </Button>
        </Card>
      </form>
    </div>
  );
}
