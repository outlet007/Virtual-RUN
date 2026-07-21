import { createAdminClient } from "@/lib/supabase/admin";
import { Card, Button, Input, Label } from "@/components/ui";
import { promoteAdmin, demoteAdmin } from "@/lib/actions/admin";

export const dynamic = "force-dynamic";

export default async function AdminAdminsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; promoted?: string; demoted?: string }>;
}) {
  const { error, promoted, demoted } = await searchParams;
  const db = createAdminClient();

  const { data } = await db
    .from("users")
    .select("id, name, email")
    .eq("role", "admin")
    .order("created_at", { ascending: true });

  const admins = data ?? [];

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h2 className="font-display text-xl font-bold">ผู้ดูแลระบบ</h2>

      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      {promoted && (
        <div className="rounded-xl bg-primary-soft px-4 py-3 text-sm text-primary-dark">
          เพิ่มผู้ดูแลระบบแล้ว
        </div>
      )}
      {demoted && (
        <div className="rounded-xl bg-primary-soft px-4 py-3 text-sm text-primary-dark">
          ถอดสิทธิ์ผู้ดูแลระบบแล้ว
        </div>
      )}

      <form action={promoteAdmin}>
        <Card className="space-y-3">
          <p className="text-sm font-semibold">เพิ่มผู้ดูแลระบบ</p>
          <div>
            <Label>อีเมลของผู้ใช้ที่สมัครสมาชิกแล้ว</Label>
            <Input name="email" type="email" required placeholder="user@example.com" />
          </div>
          <Button type="submit">เพิ่มเป็นผู้ดูแลระบบ</Button>
        </Card>
      </form>

      <div className="space-y-3">
        <p className="text-sm font-semibold">ผู้ดูแลระบบปัจจุบัน ({admins.length})</p>
        {admins.map((a) => (
          <Card key={a.id} className="flex items-center justify-between">
            <div>
              <p className="font-medium">{a.name || "ไม่ระบุชื่อ"}</p>
              <p className="text-sm text-ink/50">{a.email}</p>
            </div>
            <form action={demoteAdmin}>
              <input type="hidden" name="id" value={a.id} />
              <Button variant="ghost" type="submit">
                ถอดสิทธิ์
              </Button>
            </form>
          </Card>
        ))}
      </div>
    </div>
  );
}
