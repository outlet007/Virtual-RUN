import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, Button, Input, Label, ImageUploadField, Textarea } from "@/components/ui";
import { updateProfile, changePassword } from "@/lib/actions/profile";

export const dynamic = "force-dynamic";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string; password_changed?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("name, email, phone, avatar_url, address, province, postal_code")
    .eq("id", user.id)
    .single();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold">โปรไฟล์ของฉัน</h2>
        <p className="mt-1 text-sm text-muted">แก้ไขข้อมูลส่วนตัวและรหัสผ่านของบัญชี</p>
      </div>

      {sp.error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{sp.error}</div>
      )}
      {sp.saved && (
        <div className="rounded-xl bg-primary-soft px-4 py-3 text-sm text-primary-dark">
          บันทึกข้อมูลแล้ว
        </div>
      )}
      {sp.password_changed && (
        <div className="rounded-xl bg-primary-soft px-4 py-3 text-sm text-primary-dark">
          เปลี่ยนรหัสผ่านแล้ว
        </div>
      )}

      <form action={updateProfile}>
        <Card className="space-y-4">
          <h3 className="font-display font-bold">ข้อมูลส่วนตัว</h3>
          <ImageUploadField
            name="avatar_file"
            label="รูปโปรไฟล์"
            defaultImageUrl={profile?.avatar_url}
          />
          <div>
            <Label>อีเมล</Label>
            <Input value={profile?.email ?? user.email ?? ""} disabled />
          </div>
          <div>
            <Label>ชื่อ</Label>
            <Input name="name" defaultValue={profile?.name ?? ""} required />
          </div>
          <div>
            <Label>เบอร์โทร</Label>
            <Input name="phone" type="tel" defaultValue={profile?.phone ?? ""} />
          </div>
          <div className="border-t border-border pt-4">
            <h3 className="font-display font-bold">ข้อมูลที่อยู่</h3>
          </div>
          <div>
            <Label>ที่อยู่</Label>
            <Textarea
              name="address"
              defaultValue={profile?.address ?? ""}
              maxLength={500}
              placeholder="บ้านเลขที่ หมู่ ถนน แขวง/ตำบล เขต/อำเภอ"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label>จังหวัด</Label>
              <Input name="province" defaultValue={profile?.province ?? ""} maxLength={100} />
            </div>
            <div>
              <Label>รหัสไปรษณีย์</Label>
              <Input
                name="postal_code"
                defaultValue={profile?.postal_code ?? ""}
                inputMode="numeric"
                maxLength={5}
                pattern="[0-9]{5}"
              />
            </div>
          </div>
          <Button className="w-full" type="submit" icon="save">
            บันทึก
          </Button>
        </Card>
      </form>

      <form action={changePassword}>
        <Card className="space-y-4">
          <h3 className="font-display font-bold">เปลี่ยนรหัสผ่าน</h3>
          <div>
            <Label>รหัสผ่านใหม่</Label>
            <Input name="password" type="password" minLength={6} required />
          </div>
          <div>
            <Label>ยืนยันรหัสผ่านใหม่</Label>
            <Input name="confirm_password" type="password" minLength={6} required />
          </div>
          <Button className="w-full" type="submit" icon="shield">
            เปลี่ยนรหัสผ่าน
          </Button>
        </Card>
      </form>
    </div>
  );
}
