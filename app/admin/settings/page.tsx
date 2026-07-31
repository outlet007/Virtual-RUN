import { Link2 } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { Card, Button, Input, Label, LinkButton, ImageUploadField } from "@/components/ui";
import { ColorField } from "@/components/admin/color-field";
import { updateSystemSettings } from "@/lib/actions/admin";
import { disconnectStrava } from "@/lib/actions/strava";
import { disconnectLine } from "@/lib/actions/line";
import { DEFAULT_SETTINGS } from "@/lib/system-settings";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string; strava?: string; line?: string }>;
}) {
  const sp = await searchParams;
  const db = createAdminClient();

  const { data: settingsRow } = await db
    .from("system_settings")
    .select("site_name, logo_url, favicon_url, color_ink, color_primary, color_accent, color_medal")
    .eq("id", 1)
    .single();
  const settings = settingsRow ?? DEFAULT_SETTINGS;

  // Strava/LINE เป็นบัญชีส่วนตัวของ admin ที่ล็อกอินอยู่ (auth.uid()) ไม่ใช่ค่าระดับระบบ
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: stravaConnection } = user
    ? await supabase
        .from("strava_connections")
        .select("strava_athlete_id")
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null };

  const { data: profile } = user
    ? await supabase.from("users").select("line_user_id").eq("id", user.id).single()
    : { data: null };
  const lineConnected = Boolean(profile?.line_user_id);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold">ตั้งค่าระบบ</h2>
        <p className="mt-1 text-sm text-muted">
          ชื่อระบบ โลโก้ favicon สีธีม — แก้แล้วมีผลทันทีทั้งเว็บ ไม่ต้อง build ใหม่
        </p>
      </div>

      {sp.error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{sp.error}</div>
      )}
      {sp.saved && (
        <div className="rounded-xl bg-primary-soft px-4 py-3 text-sm text-primary-dark">
          บันทึกการตั้งค่าแล้ว
        </div>
      )}
      {sp.strava === "connected" && (
        <div className="flex items-center gap-2 rounded-xl bg-primary-soft px-4 py-3 text-sm text-primary-dark">
          <Link2 className="h-4 w-4 shrink-0" /> เชื่อมต่อ Strava สำเร็จ
        </div>
      )}
      {sp.strava === "disconnected" && (
        <div className="rounded-xl bg-lane px-4 py-3 text-sm text-muted">
          ตัดการเชื่อมต่อ Strava แล้ว
        </div>
      )}
      {sp.line === "connected" && (
        <div className="flex items-center gap-2 rounded-xl bg-primary-soft px-4 py-3 text-sm text-primary-dark">
          <Link2 className="h-4 w-4 shrink-0" /> เชื่อมต่อ LINE สำเร็จ
        </div>
      )}
      {sp.line === "disconnected" && (
        <div className="rounded-xl bg-lane px-4 py-3 text-sm text-muted">
          ตัดการเชื่อมต่อ LINE แล้ว
        </div>
      )}

      <form action={updateSystemSettings}>
        <Card className="space-y-5">
          <h3 className="font-display font-bold">แบรนด์ระบบ</h3>
          <div>
            <Label>ชื่อระบบ</Label>
            <Input name="site_name" defaultValue={settings.site_name} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <ImageUploadField name="logo_file" label="โลโก้" defaultImageUrl={settings.logo_url} />
            <ImageUploadField
              name="favicon_file"
              label="Favicon"
              defaultImageUrl={settings.favicon_url}
            />
          </div>

          <h3 className="font-display font-bold">สีธีม</h3>
          <div className="grid grid-cols-2 gap-4">
            <ColorField name="color_ink" label="สีหลัก (ink)" defaultValue={settings.color_ink} />
            <ColorField
              name="color_primary"
              label="สี primary"
              defaultValue={settings.color_primary}
            />
            <ColorField name="color_accent" label="สี accent" defaultValue={settings.color_accent} />
            <ColorField name="color_medal" label="สีเหรียญ (medal)" defaultValue={settings.color_medal} />
          </div>

          <Button className="w-full" type="submit">
            บันทึกการตั้งค่า
          </Button>
        </Card>
      </form>

      <div>
        <h3 className="mb-3 font-display font-bold">เชื่อมต่อบัญชีของฉัน</h3>
        <div className="space-y-3">
          <Card className="flex items-center justify-between">
            <div>
              <p className="font-display font-bold">Strava</p>
              <p className="text-sm text-ink/50">
                {stravaConnection
                  ? "เชื่อมต่ออยู่ — กิจกรรมวิ่ง/เดินใหม่จะถูกดึงเข้าระบบอัตโนมัติ"
                  : "เชื่อมต่อ Strava เพื่อให้ระบบดึงผลวิ่งให้อัตโนมัติ ไม่ต้องอัปโหลดเอง"}
              </p>
            </div>
            {stravaConnection ? (
              <form action={disconnectStrava}>
                <Button variant="ghost" type="submit">
                  ตัดการเชื่อมต่อ
                </Button>
              </form>
            ) : (
              <LinkButton href="/api/strava/connect">เชื่อมต่อ Strava</LinkButton>
            )}
          </Card>

          <Card className="flex items-center justify-between">
            <div>
              <p className="font-display font-bold">LINE</p>
              <p className="text-sm text-ink/50">
                {lineConnected
                  ? "เชื่อมต่ออยู่ — รับการแจ้งเตือนผ่าน LINE ได้"
                  : "เชื่อมต่อ LINE เพื่อรับการแจ้งเตือนแทน/เพิ่มเติมจากอีเมล"}
              </p>
            </div>
            {lineConnected ? (
              <form action={disconnectLine}>
                <Button variant="ghost" type="submit">
                  ตัดการเชื่อมต่อ
                </Button>
              </form>
            ) : (
              <LinkButton href="/api/line/connect">เชื่อมต่อ LINE</LinkButton>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
