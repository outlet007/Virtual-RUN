import { updateIntegrationSettings } from "@/lib/actions/integration-settings";
import {
  getIntegrationCallbackUrls,
  getIntegrationSettingsSummary,
  getSupabaseSocialProviderStatus,
} from "@/lib/integration-settings";
import type { IntegrationSource } from "@/lib/integration-configuration";
import { Button, Card, HeadingIcon, Input, Label, Select } from "@/components/ui";
import { requireSuperAdmin } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

function SourceSelect({
  id,
  name,
  value,
  environmentConfigured,
}: {
  id: string;
  name: string;
  value: IntegrationSource;
  environmentConfigured: boolean;
}) {
  return (
    <div>
      <Label htmlFor={id}>แหล่งที่มาของค่า</Label>
      <Select id={id} name={name} defaultValue={value}>
        <option value="environment">
          .env {environmentConfigured ? "— ตรวจพบค่าครบ" : "— ยังตรวจไม่พบค่าครบ"}
        </option>
        <option value="backend">Backend — ใช้ค่าที่บันทึกด้านล่าง</option>
        <option value="disabled">ปิดใช้งาน</option>
      </Select>
    </div>
  );
}

function SecretField({
  id,
  name,
  clearName,
  label,
  hasSecret,
}: {
  id: string;
  name: string;
  clearName: string;
  label: string;
  hasSecret: boolean;
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={name}
        type="password"
        autoComplete="new-password"
        maxLength={8192}
        placeholder={
          hasSecret
            ? "บันทึก secret แล้ว — เว้นว่างเพื่อใช้ค่าเดิม"
            : "กรอก secret เมื่อต้องการใช้ค่าจาก Backend"
        }
      />
      <p className="mt-1 text-xs text-ink/40">
        ระบบไม่ส่งค่าเดิมกลับมายัง browser
      </p>
      {hasSecret && (
        <label className="mt-2 flex items-start gap-2 text-sm text-red-700">
          <input
            type="checkbox"
            name={clearName}
            className="mt-0.5 h-4 w-4 rounded border-lane accent-red-600"
          />
          ลบ secret ที่บันทึกไว้
        </label>
      )}
    </div>
  );
}

function ProviderStatus({
  label,
  enabled,
  reachable,
}: {
  label: string;
  enabled: boolean;
  reachable: boolean;
}) {
  const text = !reachable
    ? "ตรวจสถานะไม่ได้"
    : enabled
      ? "เปิดใน Supabase Auth แล้ว"
      : "ยังไม่เปิดใน Supabase Auth";
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-lane px-3 py-2 text-sm">
      <span className="font-medium">{label}</span>
      <span className={enabled ? "text-primary-dark" : "text-amber-700"}>{text}</span>
    </div>
  );
}

export default async function AdminIntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  await requireSuperAdmin();
  const [sp, settings, providerStatus] = await Promise.all([
    searchParams,
    getIntegrationSettingsSummary(),
    getSupabaseSocialProviderStatus(),
  ]);
  const callbacks = getIntegrationCallbackUrls();

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="flex items-center gap-2 font-display text-xl font-bold">
          <HeadingIcon name="link" />
          การเชื่อมต่อและ API
        </h2>
        <p className="mt-1 text-sm text-muted">
          จัดการค่าเชื่อมต่อฝั่ง server โดยไม่เปิดเผย secret แก่ผู้ใช้ทั่วไป
        </p>
      </div>

      {sp.error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {sp.error}
        </div>
      )}
      {sp.saved === "1" && (
        <div className="rounded-xl bg-primary-soft px-4 py-3 text-sm text-primary-dark" role="status">
          บันทึกการตั้งค่าการเชื่อมต่อแล้ว
        </div>
      )}
      {!settings.available && (
        <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800" role="alert">
          ยังไม่พบตาราง integration_settings กรุณาใช้ migration ล่าสุดก่อนบันทึก
        </div>
      )}
      {!settings.encryption_ready && (
        <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800" role="alert">
          ต้องตั้ง BACKEND_SETTINGS_ENCRYPTION_KEY อย่างน้อย 32 ตัวอักษรใน .env
          ของแอปก่อนบันทึก secret ค่า SMTP_SETTINGS_ENCRYPTION_KEY เดิมยังใช้เป็น fallback ได้
        </div>
      )}

      <form action={updateIntegrationSettings} className="space-y-6">
        <Card className="space-y-4">
          <div>
            <h3 className="font-display font-bold">Social Login — Google และ Facebook</h3>
            <p className="mt-1 text-sm text-ink/50">
              Backend ควบคุมการแสดงปุ่มได้ แต่ credential ต้องตั้งใน Supabase Auth
              เพราะ GoTrue โหลด provider configuration ตอน container เริ่มทำงาน
            </p>
          </div>
          <ProviderStatus
            label="Google"
            enabled={providerStatus.google}
            reachable={providerStatus.reachable}
          />
          <ProviderStatus
            label="Facebook"
            enabled={providerStatus.facebook}
            reachable={providerStatus.reachable}
          />
          <div>
            <Label htmlFor="supabase-oauth-callback">Callback URL สำหรับ Google/Facebook</Label>
            <Input id="supabase-oauth-callback" value={callbacks.supabase} readOnly />
          </div>
          <div className="rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-800">
            สำหรับ Supabase แบบ self-hosted ให้แก้ .env ของ Supabase และ recreate เฉพาะ
            auth service หลังบันทึก credential การบันทึก secret ในฐานข้อมูลแอปเพียงอย่างเดียว
            ไม่สามารถเปิด provider ได้
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-start gap-2 text-sm font-medium text-ink/70">
              <input
                type="checkbox"
                name="google_login_visible"
                defaultChecked={settings.google_login_visible}
                className="mt-0.5 h-4 w-4 rounded border-lane accent-ink"
              />
              แสดงปุ่ม Google Login
            </label>
            <label className="flex items-start gap-2 text-sm font-medium text-ink/70">
              <input
                type="checkbox"
                name="facebook_login_visible"
                defaultChecked={settings.facebook_login_visible}
                className="mt-0.5 h-4 w-4 rounded border-lane accent-ink"
              />
              แสดงปุ่ม Facebook Login
            </label>
          </div>
        </Card>

        <Card className="space-y-4">
          <div>
            <h3 className="font-display font-bold">Strava API App</h3>
            <p className="mt-1 text-sm text-ink/50">
              มีผลทันทีต่อ OAuth, token refresh และ webhook เมื่อเลือก Backend
            </p>
          </div>
          <SourceSelect
            id="strava-source"
            name="strava_source"
            value={settings.strava_source}
            environmentConfigured={settings.environment_configured.strava}
          />
          <div>
            <Label htmlFor="strava-client-id">Client ID</Label>
            <Input
              id="strava-client-id"
              name="strava_client_id"
              defaultValue={settings.strava_client_id}
              maxLength={255}
            />
          </div>
          <SecretField
            id="strava-client-secret"
            name="strava_client_secret"
            clearName="clear_strava_client_secret"
            label="Client Secret"
            hasSecret={settings.has_strava_client_secret}
          />
          <SecretField
            id="strava-webhook-token"
            name="strava_webhook_verify_token"
            clearName="clear_strava_webhook_verify_token"
            label="Webhook Verify Token"
            hasSecret={settings.has_strava_webhook_verify_token}
          />
          <div>
            <Label htmlFor="strava-callback">Callback URL</Label>
            <Input id="strava-callback" value={callbacks.strava} readOnly />
          </div>
        </Card>

        <Card className="space-y-5">
          <div>
            <h3 className="font-display font-bold">LINE Login และ Messaging API</h3>
            <p className="mt-1 text-sm text-ink/50">
              LINE Login และ Messaging API เป็นคนละ channel จึงเลือกแหล่งค่าแยกกัน
            </p>
          </div>
          <div className="space-y-4">
            <h4 className="font-semibold">LINE Login</h4>
            <SourceSelect
              id="line-login-source"
              name="line_login_source"
              value={settings.line_login_source}
              environmentConfigured={settings.environment_configured.line_login}
            />
            <div>
              <Label htmlFor="line-login-channel-id">Channel ID</Label>
              <Input
                id="line-login-channel-id"
                name="line_login_channel_id"
                defaultValue={settings.line_login_channel_id}
                maxLength={255}
              />
            </div>
            <SecretField
              id="line-login-channel-secret"
              name="line_login_channel_secret"
              clearName="clear_line_login_channel_secret"
              label="Channel Secret"
              hasSecret={settings.has_line_login_channel_secret}
            />
            <div>
              <Label htmlFor="line-callback">Callback URL</Label>
              <Input id="line-callback" value={callbacks.line} readOnly />
            </div>
          </div>
          <div className="space-y-4 border-t border-lane pt-5">
            <h4 className="font-semibold">LINE Messaging API</h4>
            <SourceSelect
              id="line-messaging-source"
              name="line_messaging_source"
              value={settings.line_messaging_source}
              environmentConfigured={settings.environment_configured.line_messaging}
            />
            <SecretField
              id="line-channel-access-token"
              name="line_channel_access_token"
              clearName="clear_line_channel_access_token"
              label="Channel Access Token"
              hasSecret={settings.has_line_channel_access_token}
            />
          </div>
        </Card>

        <Card className="space-y-4">
          <div>
            <h3 className="font-display font-bold">Cloudflare Turnstile</h3>
            <p className="mt-1 text-sm text-ink/50">
              ป้องกัน bot ใน Login และ Forgot Password เลือกปิดได้โดยไม่ปิดการเข้าสู่ระบบ
            </p>
          </div>
          <SourceSelect
            id="turnstile-source"
            name="turnstile_source"
            value={settings.turnstile_source}
            environmentConfigured={settings.environment_configured.turnstile}
          />
          <div>
            <Label htmlFor="turnstile-site-key">Site Key</Label>
            <Input
              id="turnstile-site-key"
              name="turnstile_site_key"
              defaultValue={settings.turnstile_site_key}
              maxLength={255}
            />
          </div>
          <SecretField
            id="turnstile-secret-key"
            name="turnstile_secret_key"
            clearName="clear_turnstile_secret_key"
            label="Secret Key"
            hasSecret={settings.has_turnstile_secret_key}
          />
          <div>
            <Label htmlFor="turnstile-hostname">Expected Hostname</Label>
            <Input
              id="turnstile-hostname"
              name="turnstile_expected_hostname"
              defaultValue={settings.turnstile_expected_hostname}
              placeholder="vrrun.bu.ac.th"
              maxLength={253}
            />
          </div>
        </Card>

        <Card className="space-y-4">
          <div>
            <h3 className="font-display font-bold">PromptPay</h3>
            <p className="mt-1 text-sm text-ink/50">
              ใช้สร้าง QR รับเงิน ระบบจะเข้ารหัส PromptPay ID ที่เก็บในฐานข้อมูล
            </p>
          </div>
          <SourceSelect
            id="promptpay-source"
            name="promptpay_source"
            value={settings.promptpay_source}
            environmentConfigured={settings.environment_configured.promptpay}
          />
          <SecretField
            id="promptpay-id"
            name="promptpay_id"
            clearName="clear_promptpay_id"
            label="PromptPay ID"
            hasSecret={settings.has_promptpay_id}
          />
        </Card>

        <Button
          className="w-full"
          type="submit"
          icon="save"
          disabled={!settings.available}
        >
          บันทึกการตั้งค่าการเชื่อมต่อ
        </Button>
      </form>
    </div>
  );
}
