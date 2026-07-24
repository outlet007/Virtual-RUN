import { createAdminClient } from "@/lib/supabase/admin";
import { Card, Button, Input, Label, ImageUploadField } from "@/components/ui";
import { createHeroBanner, updateHeroBanner, deleteHeroBanner } from "@/lib/actions/admin";

export const dynamic = "force-dynamic";

type BannerRow = {
  id: string;
  image_url: string;
  title: string | null;
  subtitle: string | null;
  link_url: string | null;
  sort_order: number;
  is_active: boolean;
};

export default async function AdminHeroBannersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; created?: string; saved?: string; deleted?: string }>;
}) {
  const sp = await searchParams;
  const db = createAdminClient();

  const { data } = await db
    .from("hero_banners")
    .select("id, image_url, title, subtitle, link_url, sort_order, is_active")
    .order("sort_order", { ascending: true });
  const banners = (data ?? []) as BannerRow[];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold">Banner หน้าแรก</h2>
        <p className="mt-1 text-sm text-muted">
          จัดการรูป slide banner ที่แสดงบนหัวหน้าแรก — เรียงตามเลขลำดับ (น้อยไปมาก)
        </p>
      </div>

      {sp.error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{sp.error}</div>
      )}
      {(sp.created || sp.saved || sp.deleted) && (
        <div className="rounded-xl bg-primary-soft px-4 py-3 text-sm text-primary-dark">
          {sp.created && "เพิ่ม banner แล้ว"}
          {sp.saved && "บันทึกแล้ว"}
          {sp.deleted && "ลบแล้ว"}
        </div>
      )}

      <div className="space-y-3">
        {banners.map((b) => (
          <form key={b.id} action={updateHeroBanner}>
            <input type="hidden" name="id" value={b.id} />
            <input type="hidden" name="existing_image_url" value={b.image_url} />
            <Card className="space-y-3">
              <ImageUploadField
                name="image_file"
                label="รูป banner"
                defaultImageUrl={b.image_url}
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>หัวข้อ (ไม่บังคับ)</Label>
                  <Input name="title" defaultValue={b.title ?? ""} />
                </div>
                <div>
                  <Label>คำอธิบายย่อย (ไม่บังคับ)</Label>
                  <Input name="subtitle" defaultValue={b.subtitle ?? ""} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>ลิงก์ปุ่ม (ไม่บังคับ)</Label>
                  <Input name="link_url" defaultValue={b.link_url ?? ""} placeholder="/events/..." />
                </div>
                <div>
                  <Label>ลำดับ</Label>
                  <Input name="sort_order" type="number" defaultValue={b.sort_order} />
                </div>
              </div>
              <label className="flex items-center gap-1.5 text-sm">
                <input type="checkbox" name="is_active" defaultChecked={b.is_active} />
                แสดงบนหน้าแรก
              </label>
              <div className="flex items-center gap-3">
                <Button variant="ghost" type="submit">
                  บันทึก
                </Button>
                <Button
                  type="submit"
                  formAction={deleteHeroBanner}
                  className="bg-red-50 text-red-700 hover:bg-red-100"
                >
                  ลบ
                </Button>
              </div>
            </Card>
          </form>
        ))}
      </div>

      <form action={createHeroBanner} className="mt-4">
        <Card className="space-y-3">
          <p className="text-sm font-semibold">+ เพิ่ม banner ใหม่</p>
          <ImageUploadField name="image_file" label="รูป banner" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>หัวข้อ (ไม่บังคับ)</Label>
              <Input name="title" />
            </div>
            <div>
              <Label>คำอธิบายย่อย (ไม่บังคับ)</Label>
              <Input name="subtitle" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>ลิงก์ปุ่ม (ไม่บังคับ)</Label>
              <Input name="link_url" placeholder="/events/..." />
            </div>
            <div>
              <Label>ลำดับ</Label>
              <Input name="sort_order" type="number" defaultValue={banners.length} />
            </div>
          </div>
          <label className="flex items-center gap-1.5 text-sm">
            <input type="checkbox" name="is_active" defaultChecked />
            แสดงบนหน้าแรก
          </label>
          <Button type="submit">เพิ่ม banner</Button>
        </Card>
      </form>
    </div>
  );
}
