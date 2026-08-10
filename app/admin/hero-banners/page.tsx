import { createAdminClient } from "@/lib/supabase/admin";
import { Card, Button, HeadingIcon, Input, Label, ImageUploadField } from "@/components/ui";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import {
  createHeroBanner,
  updateHeroBanner,
  deleteHeroBanner,
  moveHeroBanner,
} from "@/lib/actions/admin";

export const dynamic = "force-dynamic";

type BannerRow = {
  id: string;
  image_url: string;
  title: string | null;
  subtitle: string | null;
  link_url: string | null;
  position_x: number;
  position_y: number;
  sort_order: number;
  is_active: boolean;
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
    .select("id, image_url, title, subtitle, link_url, position_x, position_y, sort_order, is_active")
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
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label>หัวข้อ (ไม่บังคับ)</Label>
                  <Input name="title" defaultValue={b.title ?? ""} />
                </div>
                <div>
                  <Label>คำอธิบายย่อย (ไม่บังคับ)</Label>
                  <Input name="subtitle" defaultValue={b.subtitle ?? ""} />
                </div>
              </div>
              <div>
                <Label>ลิงก์ปุ่ม (ไม่บังคับ)</Label>
                <Input name="link_url" defaultValue={b.link_url ?? ""} placeholder="/events/..." />
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label>หัวข้อ (ไม่บังคับ)</Label>
              <Input name="title" />
            </div>
            <div>
              <Label>คำอธิบายย่อย (ไม่บังคับ)</Label>
              <Input name="subtitle" />
            </div>
          </div>
          <div>
            <Label>ลิงก์ปุ่ม (ไม่บังคับ)</Label>
            <Input name="link_url" placeholder="/events/..." />
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
