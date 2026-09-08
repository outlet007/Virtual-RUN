import { testSmtpSettings, updateSmtpSettings } from "@/lib/actions/smtp-settings";
import type { SmtpSettingsSummary } from "@/lib/smtp-settings";
import { Button, Card, HeadingIcon, Input, Label } from "@/components/ui";

export function SmtpSettingsCard({
  settings,
  defaultTestEmail,
  saved,
  testSent,
}: {
  settings: SmtpSettingsSummary;
  defaultTestEmail: string;
  saved: boolean;
  testSent: boolean;
}) {
  return (
    <section id="smtp-settings" className="scroll-mt-6 space-y-3">
      <div>
        <h3 className="flex items-center gap-2 font-display font-bold">
          <HeadingIcon name="settings" className="size-4" />
          การส่งอีเมล (SMTP)
        </h3>
        <p className="mt-1 text-sm text-ink/50">
          ผู้ดูแลระบบสูงสุดสามารถตั้งค่าและทดสอบ SMTP ได้โดยไม่ต้องแก้ไฟล์ใน container
        </p>
      </div>

      {saved && (
        <div className="rounded-xl bg-primary-soft px-4 py-3 text-sm text-primary-dark" role="status">
          บันทึกการตั้งค่า SMTP แล้ว
        </div>
      )}
      {testSent && (
        <div className="rounded-xl bg-primary-soft px-4 py-3 text-sm text-primary-dark" role="status">
          ส่งอีเมลทดสอบแล้ว กรุณาตรวจกล่องจดหมาย
        </div>
      )}

      {!settings.available && (
        <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800" role="alert">
          ยังไม่พบตาราง SMTP กรุณาใช้ migration ของ version-3.7 ก่อนบันทึก
        </div>
      )}
      {!settings.encryption_ready && (
        <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800" role="alert">
          ต้องตั้งค่า BACKEND_SETTINGS_ENCRYPTION_KEY อย่างน้อย 32 ตัวอักษรใน .env
          ก่อนบันทึกรหัสผ่าน โดยค่า SMTP_SETTINGS_ENCRYPTION_KEY เดิมยังใช้เป็น fallback ได้
        </div>
      )}

      <form action={updateSmtpSettings}>
        <Card className="space-y-4">
          <label className="flex items-start gap-2 text-sm font-medium text-ink/70">
            <input
              type="checkbox"
              name="smtp_enabled"
              defaultChecked={settings.enabled}
              className="mt-0.5 h-4 w-4 rounded border-lane accent-ink"
            />
            ใช้ค่า SMTP จาก Backend แทนค่า SMTP ใน .env
          </label>
          <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
            <div>
              <Label htmlFor="smtp-host">SMTP Host</Label>
              <Input id="smtp-host" name="smtp_host" defaultValue={settings.host} maxLength={255} required />
            </div>
            <div>
              <Label htmlFor="smtp-port">Port</Label>
              <Input id="smtp-port" name="smtp_port" type="number" min={1} max={65535} defaultValue={settings.port} required />
            </div>
          </div>
          <label className="flex items-start gap-2 text-sm font-medium text-ink/70">
            <input
              type="checkbox"
              name="smtp_secure"
              defaultChecked={settings.secure}
              className="mt-0.5 h-4 w-4 rounded border-lane accent-ink"
            />
            ใช้ TLS ตั้งแต่เริ่มเชื่อมต่อ (ปกติใช้กับ port 465)
          </label>
          <div>
            <Label htmlFor="smtp-username">Username</Label>
            <Input id="smtp-username" name="smtp_username" defaultValue={settings.username} maxLength={320} autoComplete="off" />
          </div>
          <div>
            <Label htmlFor="smtp-password">Password / App Password</Label>
            <Input
              id="smtp-password"
              name="smtp_password"
              type="password"
              autoComplete="new-password"
              placeholder={settings.has_password ? "บันทึกรหัสผ่านไว้แล้ว — เว้นว่างเพื่อใช้ค่าเดิม" : "กรอกรหัสผ่าน SMTP"}
            />
            <p className="mt-1 text-xs text-ink/40">
              ระบบเข้ารหัสด้วย AES-256-GCM และไม่ส่งรหัสผ่านเดิมกลับมายัง browser
            </p>
          </div>
          {settings.has_password && (
            <label className="flex items-start gap-2 text-sm font-medium text-red-700">
              <input type="checkbox" name="smtp_clear_password" className="mt-0.5 h-4 w-4 rounded border-lane accent-red-600" />
              ลบรหัสผ่าน SMTP ที่บันทึกไว้
            </label>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="smtp-from-name">ชื่อผู้ส่ง</Label>
              <Input id="smtp-from-name" name="smtp_from_name" defaultValue={settings.from_name} maxLength={255} required />
            </div>
            <div>
              <Label htmlFor="smtp-from-email">อีเมลผู้ส่ง</Label>
              <Input id="smtp-from-email" name="smtp_from_email" type="email" defaultValue={settings.from_email} maxLength={254} required />
            </div>
          </div>
          <Button className="w-full" type="submit" icon="save" disabled={!settings.available}>
            บันทึกการตั้งค่า SMTP
          </Button>
        </Card>
      </form>

      <form action={testSmtpSettings}>
        <Card className="space-y-3">
          <div>
            <Label htmlFor="smtp-test-email">ส่งอีเมลทดสอบไปที่</Label>
            <Input id="smtp-test-email" name="smtp_test_email" type="email" defaultValue={defaultTestEmail} maxLength={254} required />
          </div>
          <Button className="w-full" type="submit" variant="ghost" icon="send">
            ทดสอบการส่งอีเมลด้วยค่าที่เปิดใช้งานอยู่
          </Button>
        </Card>
      </form>
    </section>
  );
}
