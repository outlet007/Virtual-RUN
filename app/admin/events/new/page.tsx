import Link from "next/link";
import { Card, Button, Input, Label, Select, ImageUploadField } from "@/components/ui";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { createEvent } from "@/lib/actions/admin";

export const dynamic = "force-dynamic";

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Link href="/admin/events" className="text-sm text-ink/50 hover:text-ink">
        ← งานทั้งหมด
      </Link>
      <h2 className="font-display text-xl font-bold">สร้างงานใหม่</h2>

      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <form action={createEvent}>
        <Card className="space-y-4">
          <div>
            <Label>ชื่องาน</Label>
            <Input name="title" required />
          </div>
          <div>
            <Label>คำนำหน้า BIB</Label>
            <Input
              name="bib_prefix"
              defaultValue="VR"
              minLength={2}
              maxLength={8}
              pattern="[A-Za-z0-9]{2,8}"
              className="uppercase"
              required
            />
            <p className="mt-1 text-xs text-ink/45">ตัวอักษรอังกฤษหรือตัวเลข 2–8 ตัว</p>
          </div>
          <div>
            <Label>รายละเอียด</Label>
            <RichTextEditor name="description" />
          </div>
          <ImageUploadField
            name="cover_image_file"
            label="รูปปกงาน (hero banner)"
            positionXName="cover_position_x"
            positionYName="cover_position_y"
            defaultPositionX={50}
            defaultPositionY={50}
          />
          <ImageUploadField name="poster_image_file" label="รูป poster" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label>ประเภทค่าสมัคร</Label>
              <Select name="pricing" defaultValue="free">
                <option value="free">ฟรี</option>
                <option value="paid">มีค่าสมัคร</option>
              </Select>
            </div>
            <div>
              <Label>สถานะ</Label>
              <Select name="status" defaultValue="draft">
                <option value="draft">ร่าง</option>
                <option value="open">เปิดรับสมัคร</option>
                <option value="closed">ปิดรับสมัคร</option>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label>วันที่เริ่ม</Label>
              <Input name="start_date" type="date" required />
            </div>
            <div>
              <Label>วันที่สิ้นสุด</Label>
              <Input name="end_date" type="date" required />
            </div>
          </div>
          <Button className="w-full" type="submit" icon="add">
            สร้างงาน
          </Button>
        </Card>
      </form>
    </div>
  );
}
