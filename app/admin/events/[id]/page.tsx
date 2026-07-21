import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, Button, Input, Label, Textarea, Select, Badge } from "@/components/ui";
import { updateEvent, createPackage, updatePackage } from "@/lib/actions/admin";

export const dynamic = "force-dynamic";

type PackageRow = {
  id: string;
  name: string;
  target_distance_km: number;
  price: number;
  activity_types: string[];
  has_physical_medal: boolean;
};

export default async function EditEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string; created?: string; package_added?: string; package_saved?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const db = createAdminClient();

  const { data: event } = await db
    .from("events")
    .select(
      "id, title, description, cover_image, pricing, start_date, end_date, status, packages(id, name, target_distance_km, price, activity_types, has_physical_medal)",
    )
    .eq("id", id)
    .single();

  if (!event) notFound();
  const packages = (event.packages ?? []) as PackageRow[];

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Link href="/admin/events" className="text-sm text-ink/50 hover:text-ink">
        ← งานทั้งหมด
      </Link>
      <h2 className="font-display text-xl font-bold">แก้ไขงาน</h2>

      {sp.error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{sp.error}</div>
      )}
      {(sp.saved || sp.created) && (
        <div className="rounded-xl bg-primary-soft px-4 py-3 text-sm text-primary-dark">
          บันทึกแล้ว
        </div>
      )}

      <form action={updateEvent}>
        <input type="hidden" name="id" value={event.id} />
        <Card className="space-y-4">
          <div>
            <Label>ชื่องาน</Label>
            <Input name="title" defaultValue={event.title} required />
          </div>
          <div>
            <Label>รายละเอียด</Label>
            <Textarea name="description" rows={4} defaultValue={event.description ?? ""} />
          </div>
          <div>
            <Label>ลิงก์รูปปก</Label>
            <Input name="cover_image" type="url" defaultValue={event.cover_image ?? ""} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>ประเภทค่าสมัคร</Label>
              <Select name="pricing" defaultValue={event.pricing}>
                <option value="free">ฟรี</option>
                <option value="paid">มีค่าสมัคร</option>
              </Select>
            </div>
            <div>
              <Label>สถานะ</Label>
              <Select name="status" defaultValue={event.status}>
                <option value="draft">ร่าง</option>
                <option value="open">เปิดรับสมัคร</option>
                <option value="closed">ปิดรับสมัคร</option>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>วันที่เริ่ม</Label>
              <Input name="start_date" type="date" defaultValue={event.start_date} required />
            </div>
            <div>
              <Label>วันที่สิ้นสุด</Label>
              <Input name="end_date" type="date" defaultValue={event.end_date} required />
            </div>
          </div>
          <Button className="w-full" type="submit">
            บันทึกงาน
          </Button>
        </Card>
      </form>

      <div>
        <h3 className="font-display text-lg font-bold">แพ็กเกจ</h3>
        {sp.package_added && (
          <p className="mt-1 text-sm text-primary-dark">เพิ่มแพ็กเกจแล้ว</p>
        )}
        {sp.package_saved && (
          <p className="mt-1 text-sm text-primary-dark">บันทึกแพ็กเกจแล้ว</p>
        )}

        <div className="mt-3 space-y-3">
          {packages.map((p) => (
            <form key={p.id} action={updatePackage}>
              <input type="hidden" name="id" value={p.id} />
              <input type="hidden" name="event_id" value={event.id} />
              <Card className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="font-display font-bold">{p.name}</span>
                  {p.has_physical_medal && (
                    <Badge className="bg-medal-soft text-medal">🏅 เหรียญจริง</Badge>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>ชื่อแพ็กเกจ</Label>
                    <Input name="name" defaultValue={p.name} required />
                  </div>
                  <div>
                    <Label>ระยะเป้าหมาย (km)</Label>
                    <Input
                      name="target_distance_km"
                      type="number"
                      min="1"
                      defaultValue={p.target_distance_km}
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label>ราคา (บาท)</Label>
                  <Input name="price" type="number" min="0" defaultValue={p.price} />
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <label className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      name="activity_types"
                      value="run"
                      defaultChecked={p.activity_types.includes("run")}
                    />
                    วิ่ง
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      name="activity_types"
                      value="walk"
                      defaultChecked={p.activity_types.includes("walk")}
                    />
                    เดิน
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      name="has_physical_medal"
                      defaultChecked={p.has_physical_medal}
                    />
                    มีเหรียญกายภาพ
                  </label>
                </div>
                <Button variant="ghost" type="submit">
                  บันทึกแพ็กเกจนี้
                </Button>
              </Card>
            </form>
          ))}
        </div>

        <form action={createPackage} className="mt-4">
          <input type="hidden" name="event_id" value={event.id} />
          <Card className="space-y-3">
            <p className="text-sm font-semibold">+ เพิ่มแพ็กเกจใหม่</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>ชื่อแพ็กเกจ</Label>
                <Input name="name" required />
              </div>
              <div>
                <Label>ระยะเป้าหมาย (km)</Label>
                <Input name="target_distance_km" type="number" min="1" required />
              </div>
            </div>
            <div>
              <Label>ราคา (บาท)</Label>
              <Input name="price" type="number" min="0" defaultValue={0} />
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <label className="flex items-center gap-1.5">
                <input type="checkbox" name="activity_types" value="run" defaultChecked />
                วิ่ง
              </label>
              <label className="flex items-center gap-1.5">
                <input type="checkbox" name="activity_types" value="walk" defaultChecked />
                เดิน
              </label>
              <label className="flex items-center gap-1.5">
                <input type="checkbox" name="has_physical_medal" />
                มีเหรียญกายภาพ
              </label>
            </div>
            <Button type="submit">เพิ่มแพ็กเกจ</Button>
          </Card>
        </form>
      </div>
    </div>
  );
}
