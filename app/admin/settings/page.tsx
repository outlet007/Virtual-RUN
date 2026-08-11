import { Link2 } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { Card, Button, HeadingIcon, Input, Label, LinkButton, ImageUploadField, Select, Textarea } from "@/components/ui";
import { ColorField } from "@/components/admin/color-field";
import { OpacityField } from "@/components/admin/opacity-field";
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
    .select(
      "site_name, site_name_en, logo_url, header_show_site_name, favicon_url, color_ink, color_primary, color_accent, color_medal, cookie_consent_enabled, cookie_consent_message, cookie_consent_message_en, cookie_policy_url, cookie_consent_button_label, cookie_consent_button_label_en, privacy_policy_text, privacy_policy_text_en, content_background_url, content_background_position_x, content_background_position_y, content_background_display, content_background_inset_top, content_background_inset_bottom, content_overlay_color, content_overlay_opacity, submission_max_distance_km, submission_daily_limit",
    )
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
        <h2 className="flex items-center gap-2 font-display text-xl font-bold">
          <HeadingIcon name="settings" />
          ตั้งค่าระบบ
        </h2>
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
          <h3 className="flex items-center gap-2 font-display font-bold">
            <HeadingIcon name="sparkles" className="size-4" />
            แบรนด์ระบบ
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>ชื่อระบบ (ไทย)</Label><Input name="site_name" defaultValue={settings.site_name} required /></div>
            <div><Label>Site Name (English)</Label><Input name="site_name_en" defaultValue={settings.site_name_en ?? ""} /></div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <ImageUploadField
                name="logo_file"
                label="โลโก้"
                defaultImageUrl={settings.logo_url}
                previewVariant="logo"
              />
              <p className="text-xs text-ink/40">
                รองรับทั้งรูปแนวยาวและรูปสี่เหลี่ยม โดย Header จะแสดงภาพครบโดยไม่ครอป
              </p>
            </div>
            <ImageUploadField
              name="favicon_file"
              label="Favicon"
              defaultImageUrl={settings.favicon_url}
            />
          </div>
          <label className="flex items-start gap-2 text-sm font-medium text-ink/70">
            <input
              type="checkbox"
              name="header_show_site_name"
              defaultChecked={settings.header_show_site_name}
              className="mt-0.5 h-4 w-4 rounded border-lane accent-ink"
            />
            แสดงชื่อระบบข้างโลโก้บน Header
          </label>

          <h3 className="flex items-center gap-2 font-display font-bold">
            <HeadingIcon name="palette" className="size-4" />
            สีธีม
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ColorField name="color_ink" label="สีหลัก (ink)" defaultValue={settings.color_ink} />
            <ColorField
              name="color_primary"
              label="สี primary"
              defaultValue={settings.color_primary}
            />
            <ColorField name="color_accent" label="สี accent" defaultValue={settings.color_accent} />
            <ColorField name="color_medal" label="สีเหรียญ (medal)" defaultValue={settings.color_medal} />
          </div>

          <div className="space-y-4 border-t border-lane pt-5">
            <div>
              <h3 className="flex items-center gap-2 font-display font-bold">
                <HeadingIcon name="shield" className="size-4" />
                นโยบายความเป็นส่วนตัว
              </h3>
              <p className="mt-1 text-sm text-ink/50">
                ข้อความนี้จะแสดงในหน้าต่าง Modal เมื่อผู้สมัครคลิกนโยบายความเป็นส่วนตัว
              </p>
            </div>
            <div>
              <Label>นโยบายความเป็นส่วนตัว (ไทย)</Label>
              <Textarea
                name="privacy_policy_text"
                rows={10}
                maxLength={20000}
                defaultValue={settings.privacy_policy_text}
                required
              />
            </div>
            <div>
              <Label>Privacy Policy (English)</Label>
              <Textarea
                name="privacy_policy_text_en"
                rows={10}
                maxLength={20000}
                defaultValue={settings.privacy_policy_text_en}
                required
              />
            </div>
          </div>

          <div className="space-y-4 border-t border-lane pt-5">
            <div>
              <h3 className="flex items-center gap-2 font-display font-bold">
                <HeadingIcon name="banner" className="size-4" />
                พื้นหลังพื้นที่เนื้อหา
              </h3>
              <p className="mt-1 text-sm text-ink/50">
                รูปและ Overlay จะใช้กับพื้นที่แสดงเนื้อหาระหว่าง Header และ Footer โดยไม่ทับ Hero Banner
              </p>
            </div>
            <ImageUploadField
              name="content_background_file"
              label="รูปพื้นหลัง"
              defaultImageUrl={settings.content_background_url}
              positionXName="content_background_position_x"
              positionYName="content_background_position_y"
              defaultPositionX={settings.content_background_position_x}
              defaultPositionY={settings.content_background_position_y}
            />
            {settings.content_background_url && (
              <label className="flex items-start gap-2 text-sm font-medium text-red-700">
                <input
                  type="checkbox"
                  name="remove_content_background"
                  className="mt-0.5 h-4 w-4 rounded border-lane accent-red-600"
                />
                นำรูปพื้นหลังปัจจุบันออก
              </label>
            )}
            <div>
              <Label>รูปแบบการแสดงผล</Label>
              <Select
                name="content_background_display"
                defaultValue={settings.content_background_display}
              >
                <option value="cover">Cover — เต็มพื้นที่โดยรักษาสัดส่วน</option>
                <option value="contain">Contain — เห็นภาพครบโดยรักษาสัดส่วน</option>
                <option value="stretch">Stretch — ยืดเต็มพื้นที่</option>
                <option value="auto">ขนาดจริง — ไม่ย่อหรือขยาย</option>
                <option value="repeat">Repeat — วางภาพซ้ำทุกทิศทาง</option>
                <option value="repeat-x">Repeat แนวนอน</option>
                <option value="repeat-y">Repeat แนวตั้ง</option>
              </Select>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label>ระยะเว้นด้านบน (px)</Label>
                <Input
                  type="number"
                  name="content_background_inset_top"
                  min={0}
                  max={2000}
                  step={1}
                  defaultValue={settings.content_background_inset_top}
                />
              </div>
              <div>
                <Label>ระยะเว้นด้านล่าง (px)</Label>
                <Input
                  type="number"
                  name="content_background_inset_bottom"
                  min={0}
                  max={2000}
                  step={1}
                  defaultValue={settings.content_background_inset_bottom}
                />
              </div>
            </div>
            <p className="text-xs text-ink/40">
              กำหนดระยะที่รูปพื้นหลังและ Overlay เว้นจากขอบบนและขอบล่างของพื้นที่เนื้อหา
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <ColorField
                name="content_overlay_color"
                label="สี Overlay"
                defaultValue={settings.content_overlay_color}
              />
              <OpacityField
                name="content_overlay_opacity"
                label="Opacity ของ Overlay"
                defaultValue={settings.content_overlay_opacity}
              />
            </div>
            <p className="text-xs text-ink/40">
              0% คือโปร่งใสทั้งหมด และ 100% คือแสดงสี Overlay เต็มพื้นที่
            </p>
          </div>

          <div className="space-y-4 border-t border-lane pt-5">
            <div>
              <h3 className="flex items-center gap-2 font-display font-bold">
                <HeadingIcon name="sliders" className="size-4" />
                กฎตรวจผลวิ่ง
              </h3>
              <p className="mt-1 text-sm text-ink/50">
                รายการที่เกินเงื่อนไขจะถูกตั้งสถานะผิดปกติเพื่อให้ Admin ตรวจสอบ
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label>ระยะสูงสุดต่อครั้ง (กม.)</Label>
                <Input
                  type="number"
                  name="submission_max_distance_km"
                  min={0.1}
                  max={1000}
                  step={0.01}
                  defaultValue={settings.submission_max_distance_km}
                  required
                />
                <p className="mt-1 text-xs text-ink/40">ปรับได้ตั้งแต่ 0.1–1,000 กม.</p>
              </div>
              <div>
                <Label>จำนวนส่งผลสูงสุดต่อวัน/ใบสมัคร</Label>
                <Input
                  type="number"
                  name="submission_daily_limit"
                  min={1}
                  max={50}
                  step={1}
                  defaultValue={settings.submission_daily_limit}
                  required
                />
                <p className="mt-1 text-xs text-ink/40">รายการถัดจากจำนวนนี้จะถูก Flag</p>
              </div>
            </div>
          </div>

          <div className="space-y-4 border-t border-lane pt-5">
            <div>
              <h3 className="flex items-center gap-2 font-display font-bold">
                <HeadingIcon name="cookie" className="size-4" />
                Cookie Consent
              </h3>
              <p className="mt-1 text-sm text-ink/50">
                แสดงแถบแจ้งการใช้ Cookie ที่ด้านล่างของทุกหน้า ผู้ใช้ที่กดยอมรับแล้วจะไม่เห็นซ้ำเป็นเวลา 180 วัน
              </p>
            </div>
            <label className="flex items-start gap-2 text-sm font-medium text-ink/70">
              <input
                type="checkbox"
                name="cookie_consent_enabled"
                defaultChecked={settings.cookie_consent_enabled}
                className="mt-0.5 h-4 w-4 rounded border-lane accent-ink"
              />
              เปิดใช้งาน Cookie Consent
            </label>
            <div>
              <Label>ข้อความแจ้งการใช้ Cookie (ไทย)</Label>
              <Textarea
                name="cookie_consent_message"
                rows={3}
                maxLength={1000}
                defaultValue={settings.cookie_consent_message}
                required
              />
              <p className="mt-1 text-xs text-ink/40">
                รองรับ HTML สำหรับจัดรูปแบบ เช่น &lt;strong&gt;, &lt;em&gt;, &lt;u&gt;, &lt;br&gt; และ &lt;a&gt;
              </p>
            </div>
            <div>
              <Label>Cookie Notice (English)</Label>
              <Textarea name="cookie_consent_message_en" rows={3} maxLength={1000} defaultValue={settings.cookie_consent_message_en ?? ""} />
            </div>
            <div>
              <Label>URL นโยบาย Cookie</Label>
              <Input
                name="cookie_policy_url"
                maxLength={2048}
                defaultValue={settings.cookie_policy_url}
                placeholder="/cookie-policy หรือ https://example.com/cookie-policy"
              />
              <p className="mt-1 text-xs text-ink/40">เว้นว่างได้ หากยังไม่มีหน้านโยบาย Cookie</p>
            </div>
            <div>
              <Label>ข้อความบนปุ่มยอมรับ (ไทย)</Label>
              <Input
                name="cookie_consent_button_label"
                maxLength={50}
                defaultValue={settings.cookie_consent_button_label}
                required
              />
            </div>
            <div><Label>Accept Button Text (English)</Label><Input name="cookie_consent_button_label_en" maxLength={50} defaultValue={settings.cookie_consent_button_label_en ?? ""} /></div>
          </div>

          <Button className="w-full" type="submit" icon="save">
            บันทึกการตั้งค่า
          </Button>
        </Card>
      </form>

      <div>
        <h3 className="mb-3 flex items-center gap-2 font-display font-bold">
          <HeadingIcon name="link" className="size-4" />
          เชื่อมต่อบัญชีของฉัน
        </h3>
        <div className="space-y-3">
          <Card className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="font-display font-bold">Strava</p>
              <p className="text-sm text-ink/50">
                {stravaConnection
                  ? "เชื่อมต่ออยู่ — กิจกรรมวิ่ง/เดินใหม่จะถูกดึงเข้าระบบอัตโนมัติ"
                  : "เชื่อมต่อ Strava เพื่อให้ระบบดึงผลวิ่งให้อัตโนมัติ ไม่ต้องอัปโหลดเอง"}
              </p>
            </div>
            {stravaConnection ? (
              <form action={disconnectStrava}>
                <Button variant="ghost" type="submit" icon="unlink">
                  ตัดการเชื่อมต่อ
                </Button>
              </form>
            ) : (
              <LinkButton href="/api/strava/connect" icon="connect">เชื่อมต่อ Strava</LinkButton>
            )}
          </Card>

          <Card className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="font-display font-bold">LINE</p>
              <p className="text-sm text-ink/50">
                {lineConnected
                  ? "เชื่อมต่ออยู่ — รับการแจ้งเตือนผ่าน LINE ได้"
                  : "เชื่อมต่อ LINE เพื่อรับการแจ้งเตือนแทน/เพิ่มเติมจากอีเมล"}
              </p>
            </div>
            {lineConnected ? (
              <form action={disconnectLine}>
                <Button variant="ghost" type="submit" icon="unlink">
                  ตัดการเชื่อมต่อ
                </Button>
              </form>
            ) : (
              <LinkButton href="/api/line/connect" icon="connect">เชื่อมต่อ LINE</LinkButton>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
