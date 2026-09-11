import { Tabs } from "@/components/ui/tabs";
import { Button, Card, HeadingIcon, Input, Label, LinkButton, Textarea } from "@/components/ui";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { updateLegalDocument } from "@/lib/actions/legal-settings";
import { requireSuperAdmin } from "@/lib/auth/admin";
import {
  isLegalDocumentKey,
  LEGAL_DOCUMENT_CONFIG,
  normalizeLegalRichText,
  type LegalDocumentKey,
} from "@/lib/legal-settings";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_SETTINGS } from "@/lib/system-settings";

export const dynamic = "force-dynamic";

type LegalSettings = Pick<
  typeof DEFAULT_SETTINGS,
  | "privacy_policy_text"
  | "privacy_policy_text_en"
  | "terms_of_service_text"
  | "terms_of_service_text_en"
  | "data_deletion_text"
  | "data_deletion_text_en"
  | "privacy_header_title"
  | "privacy_header_title_en"
  | "privacy_header_subtitle"
  | "privacy_header_subtitle_en"
  | "terms_header_title"
  | "terms_header_title_en"
  | "terms_header_subtitle"
  | "terms_header_subtitle_en"
  | "data_deletion_header_title"
  | "data_deletion_header_title_en"
  | "data_deletion_header_subtitle"
  | "data_deletion_header_subtitle_en"
  | "privacy_contact_text"
  | "privacy_contact_text_en"
  | "terms_contact_text"
  | "terms_contact_text_en"
  | "data_deletion_contact_text"
  | "data_deletion_contact_text_en"
>;

const tabLabels: Record<LegalDocumentKey, string> = {
  privacy: "นโยบายความเป็นส่วนตัว / Privacy",
  terms: "ข้อกำหนดการใช้บริการ / Terms",
  "data-deletion": "การลบข้อมูลผู้ใช้ / Data Deletion",
};

function LegalEditor({
  document,
  settings,
  available,
}: {
  document: LegalDocumentKey;
  settings: LegalSettings;
  available: boolean;
}) {
  const config = LEGAL_DOCUMENT_CONFIG[document];
  const thaiText = settings[config.thaiField];
  const englishText = settings[config.englishField];
  const titleThaiText = settings[config.titleThaiField];
  const titleEnglishText = settings[config.titleEnglishField];
  const subtitleThaiText = settings[config.subtitleThaiField];
  const subtitleEnglishText = settings[config.subtitleEnglishField];
  const contactThaiText = settings[config.contactThaiField];
  const contactEnglishText = settings[config.contactEnglishField];

  return (
    <form action={updateLegalDocument} className="px-4 pb-5 sm:px-6 sm:pb-6">
      <input type="hidden" name="document" value={document} />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-ink/55">
          แก้ไขเนื้อหาทั้งสองภาษาแล้วกดบันทึก หน้าเว็บจะแสดงเฉพาะภาษาที่ผู้ใช้เลือก
        </p>
        <LinkButton href={config.publicPath} target="_blank" variant="ghost" icon="view">
          ดูหน้าแสดงผล
        </LinkButton>
      </div>
      <section className="mb-6 rounded-2xl border border-lane bg-lane/20 p-4 sm:p-5">
        <h3 className="font-display text-base font-bold">Header title และ Sub title</h3>
        <p className="mt-1 text-sm text-ink/55">
          ข้อความส่วนหัวนี้ใช้เฉพาะหน้า {tabLabels[document]} และแสดงตามภาษาที่ผู้ใช้เลือก
        </p>
        <div className="mt-4 grid gap-5 lg:grid-cols-2">
          <div>
            <Label htmlFor={`${document}-title-th`}>ชื่อ Header title (ไทย)</Label>
            <Input
              id={`${document}-title-th`}
              name="title_th"
              defaultValue={titleThaiText}
              maxLength={240}
              required
            />
          </div>
          <div>
            <Label htmlFor={`${document}-title-en`}>Header title (English)</Label>
            <Input
              id={`${document}-title-en`}
              name="title_en"
              defaultValue={titleEnglishText}
              maxLength={240}
              required
            />
          </div>
          <div>
            <Label htmlFor={`${document}-subtitle-th`}>Sub title (ไทย)</Label>
            <Textarea
              id={`${document}-subtitle-th`}
              name="subtitle_th"
              defaultValue={subtitleThaiText}
              maxLength={500}
              rows={3}
              required
            />
          </div>
          <div>
            <Label htmlFor={`${document}-subtitle-en`}>Sub title (English)</Label>
            <Textarea
              id={`${document}-subtitle-en`}
              name="subtitle_en"
              defaultValue={subtitleEnglishText}
              maxLength={500}
              rows={3}
              required
            />
          </div>
        </div>
      </section>
      <div className="grid gap-5 lg:grid-cols-2">
        <div>
          <Label>เนื้อหา (ไทย)</Label>
          <RichTextEditor
            name="text_th"
            defaultValue={normalizeLegalRichText(thaiText)}
            uploadTarget="content"
          />
        </div>
        <div>
          <Label>Content (English)</Label>
          <RichTextEditor
            name="text_en"
            defaultValue={normalizeLegalRichText(englishText)}
            uploadTarget="content"
          />
        </div>
      </div>
      <section className="mt-6 rounded-2xl border border-lane bg-lane/20 p-4 sm:p-5">
          <h3 className="font-display text-base font-bold">ข้อความติดต่อผู้ดูแล</h3>
          <p className="mt-1 text-sm text-ink/55">
            ข้อความนี้ใช้เฉพาะหน้า {tabLabels[document]} และจะแสดงเฉพาะภาษาที่ผู้ใช้เลือก
          </p>
          <div className="mt-4 grid gap-5 lg:grid-cols-2">
            <div>
              <Label htmlFor={`${document}-contact-th`}>ข้อความติดต่อภาษาไทย</Label>
              <Textarea
                id={`${document}-contact-th`}
                name="contact_text_th"
                rows={4}
                maxLength={2000}
                defaultValue={contactThaiText}
                required
              />
            </div>
            <div>
              <Label htmlFor={`${document}-contact-en`}>English contact text</Label>
              <Textarea
                id={`${document}-contact-en`}
                name="contact_text_en"
                rows={4}
                maxLength={2000}
                defaultValue={contactEnglishText}
                required
              />
            </div>
          </div>
      </section>
      <Button className="mt-5 w-full sm:w-auto" type="submit" icon="save" disabled={!available}>
        บันทึก {tabLabels[document]}
      </Button>
    </form>
  );
}

export default async function AdminLegalPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; saved?: string; error?: string }>;
}) {
  await requireSuperAdmin();
  const sp = await searchParams;
  const activeTab = isLegalDocumentKey(sp.tab) ? sp.tab : "privacy";
  const db = createAdminClient();
  const { data, error } = await db
    .from("system_settings")
    .select(
      "privacy_policy_text, privacy_policy_text_en, terms_of_service_text, terms_of_service_text_en, data_deletion_text, data_deletion_text_en, privacy_header_title, privacy_header_title_en, privacy_header_subtitle, privacy_header_subtitle_en, terms_header_title, terms_header_title_en, terms_header_subtitle, terms_header_subtitle_en, data_deletion_header_title, data_deletion_header_title_en, data_deletion_header_subtitle, data_deletion_header_subtitle_en, privacy_contact_text, privacy_contact_text_en, terms_contact_text, terms_contact_text_en, data_deletion_contact_text, data_deletion_contact_text_en",
    )
    .eq("id", 1)
    .single();
  const settings: LegalSettings = data ?? DEFAULT_SETTINGS;
  const available = !error;

  const tabs = (Object.keys(LEGAL_DOCUMENT_CONFIG) as LegalDocumentKey[]).map((document) => ({
    id: document,
    label: tabLabels[document],
    content: <LegalEditor document={document} settings={settings} available={available} />,
  }));

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h2 className="flex items-center gap-2 font-display text-xl font-bold">
          <HeadingIcon name="shield" />
          Privacy / Terms
        </h2>
        <p className="mt-1 text-sm text-muted">
          จัดการนโยบายความเป็นส่วนตัว ข้อกำหนดการใช้บริการ และคำแนะนำการลบข้อมูลจากจุดเดียว
        </p>
      </div>

      {sp.error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{sp.error}</div>}
      {sp.saved === "1" && (
        <div className="rounded-xl bg-primary-soft px-4 py-3 text-sm text-primary-dark">
          บันทึกเนื้อหาเรียบร้อยแล้ว
        </div>
      )}
      {!available && (
        <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          ยังไม่พบคอลัมน์สำหรับหน้าเอกสาร กรุณาใช้ Supabase migration ล่าสุดก่อนบันทึก
        </div>
      )}

      <Card className="p-0 sm:p-0">
        <Tabs tabs={tabs} defaultTab={activeTab} />
      </Card>
    </div>
  );
}
