import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, Button, HeadingIcon, Input, Label, ImageUploadField, Textarea } from "@/components/ui";
import { updateProfile, changePassword } from "@/lib/actions/profile";
import { getLocale } from "@/lib/i18n/server";
import { tx } from "@/lib/i18n/shared";

export const dynamic = "force-dynamic";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string; password_changed?: string }>;
}) {
  const sp = await searchParams;
  const [supabase, locale] = await Promise.all([createClient(), getLocale()]);
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
        <h2 className="flex items-center gap-2 font-display text-xl font-bold">
          <HeadingIcon name="user" />
          {tx(locale, "โปรไฟล์ของฉัน", "My profile")}
        </h2>
        <p className="mt-1 text-sm text-muted">{tx(locale, "แก้ไขข้อมูลส่วนตัวและรหัสผ่านของบัญชี", "Update your personal details and password")}</p>
      </div>

      {sp.error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{sp.error}</div>
      )}
      {sp.saved && (
        <div className="rounded-xl bg-primary-soft px-4 py-3 text-sm text-primary-dark">
          {tx(locale, "บันทึกข้อมูลแล้ว", "Profile saved")}
        </div>
      )}
      {sp.password_changed && (
        <div className="rounded-xl bg-primary-soft px-4 py-3 text-sm text-primary-dark">
          {tx(locale, "เปลี่ยนรหัสผ่านแล้ว", "Password changed")}
        </div>
      )}

      <form action={updateProfile}>
        <Card className="space-y-4">
          <h3 className="flex items-center gap-2 font-display font-bold">
            <HeadingIcon name="identity" className="size-4" />
            {tx(locale, "ข้อมูลส่วนตัว", "Personal information")}
          </h3>
          <ImageUploadField
            name="avatar_file"
            label={tx(locale, "รูปโปรไฟล์", "Profile image")}
            defaultImageUrl={profile?.avatar_url}
          />
          <div>
            <Label>{tx(locale, "อีเมล", "Email")}</Label>
            <Input value={profile?.email ?? user.email ?? ""} disabled />
          </div>
          <div>
            <Label>{tx(locale, "ชื่อ", "Name")}</Label>
            <Input name="name" defaultValue={profile?.name ?? ""} required />
          </div>
          <div>
            <Label>{tx(locale, "เบอร์โทร", "Phone")}</Label>
            <Input name="phone" type="tel" defaultValue={profile?.phone ?? ""} />
          </div>
          <div className="border-t border-border pt-4">
            <h3 className="flex items-center gap-2 font-display font-bold">
              <HeadingIcon name="mapPin" className="size-4" />
              {tx(locale, "ข้อมูลที่อยู่", "Address")}
            </h3>
          </div>
          <div>
            <Label>{tx(locale, "ที่อยู่", "Address")}</Label>
            <Textarea
              name="address"
              defaultValue={profile?.address ?? ""}
              maxLength={500}
              placeholder={tx(locale, "บ้านเลขที่ หมู่ ถนน แขวง/ตำบล เขต/อำเภอ", "House number, street, district")}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label>{tx(locale, "จังหวัด", "Province")}</Label>
              <Input name="province" defaultValue={profile?.province ?? ""} maxLength={100} />
            </div>
            <div>
              <Label>{tx(locale, "รหัสไปรษณีย์", "Postal code")}</Label>
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
            {tx(locale, "บันทึก", "Save")}
          </Button>
        </Card>
      </form>

      <form action={changePassword}>
        <Card className="space-y-4">
          <h3 className="flex items-center gap-2 font-display font-bold">
            <HeadingIcon name="key" className="size-4" />
            {tx(locale, "เปลี่ยนรหัสผ่าน", "Change password")}
          </h3>
          <div>
            <Label>{tx(locale, "รหัสผ่านใหม่", "New password")}</Label>
            <Input name="password" type="password" minLength={6} required />
          </div>
          <div>
            <Label>{tx(locale, "ยืนยันรหัสผ่านใหม่", "Confirm new password")}</Label>
            <Input name="confirm_password" type="password" minLength={6} required />
          </div>
          <Button className="w-full" type="submit" icon="shield">
            {tx(locale, "เปลี่ยนรหัสผ่าน", "Change password")}
          </Button>
        </Card>
      </form>
    </div>
  );
}
