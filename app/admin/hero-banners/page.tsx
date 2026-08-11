import { createAdminClient } from "@/lib/supabase/admin";
import { Card, Button, HeadingIcon, Input, Label, ImageUploadField, Textarea } from "@/components/ui";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import {
  createHeroBanner,
  updateHeroBanner,
  deleteHeroBanner,
  moveHeroBanner,
} from "@/lib/actions/admin";
import { DEFAULT_SETTINGS } from "@/lib/system-settings";

export const dynamic = "force-dynamic";

type BannerRow = {
  id: string;
  image_url: string;
  kicker: string;
  kicker_en: string;
  title: string;
  title_en: string;
  highlight: string;
  highlight_en: string;
  title_suffix: string;
  title_suffix_en: string;
  subtitle: string;
  subtitle_en: string;
  link_url: string | null;
  position_x: number;
  position_y: number;
  sort_order: number;
  is_active: boolean;
};

type BannerContent = Pick<
  BannerRow,
  | "kicker"
  | "kicker_en"
  | "title"
  | "title_en"
  | "highlight"
  | "highlight_en"
  | "title_suffix"
  | "title_suffix_en"
  | "subtitle"
  | "subtitle_en"
>;

function BannerContentFields({ values }: { values: BannerContent }) {
  return (
    <div className="space-y-3 rounded-xl border border-lane bg-lane/20 p-4">
      <div>
        <p className="font-display font-bold">ข้อความบน Banner รูปนี้</p>
        <p className="mt-1 text-xs text-ink/45">
          ข้อความทั้งหมดจะเปลี่ยนพร้อมรูปเมื่อเลื่อนสไลด์
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><Label>ข้อความนำ (ไทย)</Label><Input name="kicker" maxLength={120} defaultValue={values.kicker} required /></div>
        <div><Label>Eyebrow Text (English)</Label><Input name="kicker_en" maxLength={120} defaultValue={values.kicker_en} required /></div>
        <div><Label>หัวข้อหลัก (ไทย)</Label><Input name="title" maxLength={160} defaultValue={values.title} required /></div>
        <div><Label>Main Heading (English)</Label><Input name="title_en" maxLength={160} defaultValue={values.title_en} required /></div>
        <div><Label>ข้อความไฮไลต์ (ไทย)</Label><Input name="highlight" maxLength={160} defaultValue={values.highlight} required /></div>
        <div><Label>Highlighted Text (English)</Label><Input name="highlight_en" maxLength={160} defaultValue={values.highlight_en} required /></div>
        <div><Label>ข้อความต่อท้าย (ไทย)</Label><Input name="title_suffix" maxLength={160} defaultValue={values.title_suffix} required /></div>
        <div><Label>Suffix Text (English)</Label><Input name="title_suffix_en" maxLength={160} defaultValue={values.title_suffix_en} required /></div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><Label>คำอธิบาย (ไทย)</Label><Textarea name="subtitle" rows={4} maxLength={1000} defaultValue={values.subtitle} required /></div>
        <div><Label>Description (English)</Label><Textarea name="subtitle_en" rows={4} maxLength={1000} defaultValue={values.subtitle_en} required /></div>
      </div>
    </div>
  );
}

const NEW_BANNER_CONTENT: BannerContent = {
  kicker: DEFAULT_SETTINGS.home_hero_kicker,
  kicker_en: DEFAULT_SETTINGS.home_hero_kicker_en,
  title: DEFAULT_SETTINGS.home_hero_title,
  title_en: DEFAULT_SETTINGS.home_hero_title_en,
  highlight: DEFAULT_SETTINGS.home_hero_highlight,
  highlight_en: DEFAULT_SETTINGS.home_hero_highlight_en,
  title_suffix: DEFAULT_SETTINGS.home_hero_suffix,
  title_suffix_en: DEFAULT_SETTINGS.home_hero_suffix_en,
  subtitle: DEFAULT_SETTINGS.home_hero_description,
  subtitle_en: DEFAULT_SETTINGS.home_hero_description_en,
};

export default async function AdminHeroBannersPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    created?: string;
    saved?: string;
    deleted?: string;
    reordered?: string;
  }>;
}) {
  const sp = await searchParams;
  const db = createAdminClient();

  const { data } = await db
    .from("hero_banners")
    .select("id, image_url, kicker, kicker_en, title, title_en, highlight, highlight_en, title_suffix, title_suffix_en, subtitle, subtitle_en, link_url, position_x, position_y, sort_order, is_active")
    .order("sort_order", { ascending: true });
  const banners = (data ?? []) as BannerRow[];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 font-display text-xl font-bold">
          <HeadingIcon name="banner" />
          Banner หน้าแรก
        </h2>
        <p className="mt-1 text-sm text-muted">
          จัดการรูป slide banner ที่แสดงบนหัวหน้าแรก — เรียงตามเลขลำดับ (น้อยไปมาก)
        </p>
      </div>

      {sp.error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{sp.error}</div>
      )}
      {(sp.created || sp.saved || sp.deleted || sp.reordered) && (
        <div className="rounded-xl bg-primary-soft px-4 py-3 text-sm text-primary-dark">
          {sp.created && "เพิ่ม banner แล้ว"}
          {sp.saved && "บันทึกแล้ว"}
          {sp.deleted && "ลบแล้ว"}
          {sp.reordered && "ย้ายลำดับ banner แล้ว"}
        </div>
      )}

      <div className="space-y-3">
        {banners.map((b, index) => (
          <form key={b.id} action={updateHeroBanner}>
            <input type="hidden" name="id" value={b.id} />
            <input type="hidden" name="existing_image_url" value={b.image_url} />
            <Card className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium text-muted">ลำดับ {index + 1}</span>
                <div className="flex items-center gap-2">
                  <Button
                    type="submit"
                    variant="ghost"
                    formAction={moveHeroBanner.bind(null, b.id, "up")}
                    disabled={index === 0}
                    icon="up">
                    เลื่อนขึ้น
                  </Button>
                  <Button
                    type="submit"
                    variant="ghost"
                    formAction={moveHeroBanner.bind(null, b.id, "down")}
                    disabled={index === banners.length - 1}
                    icon="down">
                    เลื่อนลง
                  </Button>
                </div>
              </div>
              <ImageUploadField
                name="image_file"
                label="รูป banner"
                defaultImageUrl={b.image_url}
                positionXName="position_x"
                positionYName="position_y"
                defaultPositionX={b.position_x}
                defaultPositionY={b.position_y}
              />
              <BannerContentFields values={b} />
              <div>
                <Label>ลิงก์ปุ่ม (ไม่บังคับ)</Label>
                <Input name="link_url" defaultValue={b.link_url ?? ""} placeholder="/events/..." />
                <p className="mt-1 text-xs text-ink/40">
                  เมื่อกำหนดลิงก์ ระบบจะแสดงปุ่มดูรายละเอียดบน Banner รูปนี้
                </p>
              </div>
              <label className="flex items-center gap-1.5 text-sm">
                <input type="checkbox" name="is_active" defaultChecked={b.is_active} />
                แสดงบนหน้าแรก
              </label>
              <div className="flex items-center gap-3">
                <Button variant="ghost" type="submit" icon="save">
                  บันทึก
                </Button>
                <ConfirmDeleteButton
                  formAction={deleteHeroBanner}
                  triggerLabel="ลบ Banner"
                  title="ยืนยันการลบ Banner"
                  description={`ต้องการลบ Banner "${b.title || `ลำดับ ${index + 1}`}" ใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้`}
                />
              </div>
            </Card>
          </form>
        ))}
      </div>

      <form action={createHeroBanner} className="mt-4">
        <Card className="space-y-3">
          <p className="text-sm font-semibold">+ เพิ่ม banner ใหม่</p>
          <ImageUploadField
            name="image_file"
            label="รูป banner"
            positionXName="position_x"
            positionYName="position_y"
            defaultPositionX={50}
            defaultPositionY={50}
          />
          <BannerContentFields values={NEW_BANNER_CONTENT} />
          <div>
            <Label>ลิงก์ปุ่ม (ไม่บังคับ)</Label>
            <Input name="link_url" placeholder="/events/..." />
            <p className="mt-1 text-xs text-ink/40">
              เมื่อกำหนดลิงก์ ระบบจะแสดงปุ่มดูรายละเอียดบน Banner รูปนี้
            </p>
          </div>
          <label className="flex items-center gap-1.5 text-sm">
            <input type="checkbox" name="is_active" defaultChecked />
            แสดงบนหน้าแรก
          </label>
          <Button type="submit" icon="add">เพิ่ม banner</Button>
        </Card>
      </form>
    </div>
  );
}
