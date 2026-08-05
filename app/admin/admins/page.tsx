import { createAdminClient } from "@/lib/supabase/admin";
import { Card, Button, Input, Label } from "@/components/ui";
import { removeAdminRole, setAdminRole } from "@/lib/actions/admin";
import { ADMIN_ROLES, ADMIN_ROLE_LABELS, requireSuperAdmin } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

export default async function AdminAdminsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string; demoted?: string }>;
}) {
  await requireSuperAdmin();
  const { error, saved, demoted } = await searchParams;
  const db = createAdminClient();

  const { data } = await db
    .from("users")
    .select("id, name, email, role")
    .in("role", [...ADMIN_ROLES])
    .order("created_at", { ascending: true });

  const admins = data ?? [];

  return (
    <div className="w-full max-w-none space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold">กำหนดระดับสิทธิ์</h2>
        <p className="mt-1 text-sm text-ink/60">
          ผู้ดูแลระบบสูงสุดจัดการสิทธิ์ได้ทั้งหมด ผู้ดูแลระบบจัดการเนื้อหา และเจ้าหน้าที่ดูแลงานประจำวัน
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      {saved && (
        <div className="rounded-xl bg-primary-soft px-4 py-3 text-sm text-primary-dark">
          บันทึกระดับสิทธิ์แล้ว
        </div>
      )}
      {demoted && (
        <div className="rounded-xl bg-primary-soft px-4 py-3 text-sm text-primary-dark">
          ถอดสิทธิ์ผู้ดูแลระบบแล้ว
        </div>
      )}

      <form action={setAdminRole}>
        <Card className="max-w-xl space-y-3">
          <p className="text-sm font-semibold">เพิ่มผู้ดูแลระบบหรือเจ้าหน้าที่</p>
          <div>
            <Label>อีเมลของผู้ใช้ที่สมัครสมาชิกแล้ว</Label>
            <Input name="email" type="email" required placeholder="user@example.com" />
          </div>
          <div>
            <Label>เลือกระดับผู้ดูแลระบบ</Label>
            <select name="role" defaultValue="staff" className="w-full rounded-xl border border-lane bg-paper px-3 py-2.5 text-sm">
              {ADMIN_ROLES.map((role) => (
                <option key={role} value={role}>{ADMIN_ROLE_LABELS[role]}</option>
              ))}
            </select>
          </div>
          <Button type="submit" icon="userCheck">บันทึกสิทธิ์</Button>
        </Card>
      </form>

      <div className="space-y-3">
        <p className="text-sm font-semibold">บัญชีหลังบ้านปัจจุบัน ({admins.length})</p>
        <div className="grid gap-3 md:grid-cols-3">
          {admins.map((a) => (
            <Card key={a.id} className="space-y-4">
              <div>
                <p className="font-medium">{a.name || "ไม่ระบุชื่อ"}</p>
                <p className="text-sm text-ink/50">{a.email}</p>
              </div>
              <form action={setAdminRole} className="space-y-2">
                <input type="hidden" name="id" value={a.id} />
                <Label>เลือกระดับผู้ดูแลระบบ</Label>
                <div className="flex items-center gap-2">
                  <select name="role" defaultValue={a.role} className="min-w-0 flex-1 rounded-xl border border-lane bg-paper px-3 py-2.5 text-sm">
                    {ADMIN_ROLES.map((role) => (
                      <option key={role} value={role}>{ADMIN_ROLE_LABELS[role]}</option>
                    ))}
                  </select>
                  <Button type="submit" icon="save">บันทึก</Button>
                </div>
              </form>
              <form action={removeAdminRole}>
                <input type="hidden" name="id" value={a.id} />
                <Button variant="ghost" type="submit" icon="unlink">ถอดสิทธิ์</Button>
              </form>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
