import Link from "next/link";
import { Card, Button, Input, Label, Textarea, Select } from "@/components/ui";
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
            <Label>รายละเอียด</Label>
            <Textarea name="description" rows={4} />
          </div>
          <div>
            <Label>ลิงก์รูปปก</Label>
            <Input name="cover_image" type="url" placeholder="https://..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>วันที่เริ่ม</Label>
              <Input name="start_date" type="date" required />
            </div>
            <div>
              <Label>วันที่สิ้นสุด</Label>
              <Input name="end_date" type="date" required />
            </div>
          </div>
          <Button className="w-full" type="submit">
            สร้างงาน
          </Button>
        </Card>
      </form>
    </div>
  );
}
