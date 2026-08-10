import { createAdminClient } from "@/lib/supabase/admin";
import { Card, Button, HeadingIcon, Input, Label, Badge } from "@/components/ui";
import { CreateLevelModal } from "@/components/admin/create-level-modal";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { deleteLevel, updateLevel } from "@/lib/actions/levels";

export const dynamic = "force-dynamic";

type LevelRow = {
  id: string;
  level_number: number;
  name: string;
  min_xp: number;
};

export default async function AdminLevelsPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    create?: string;
    added?: string;
    saved?: string;
    deleted?: string;
  }>;
}) {
  const sp = await searchParams;
  const db = createAdminClient();
  const { data } = await db
    .from("levels")
    .select("id, level_number, name, min_xp")
    .order("level_number");
  const levels = (data ?? []) as LevelRow[];

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 font-display text-xl font-bold">
            <HeadingIcon name="level" />
            จัดการ Level และ XP
          </h2>
          <p className="mt-1 text-sm text-muted">
            กำหนดชื่อและ XP ขั้นต่ำที่ผู้ใช้งานต้องสะสมเพื่อปลดล็อกแต่ละ Level
          </p>
        </div>
        <CreateLevelModal initialOpen={sp.create === "1"} error={sp.error} />
      </div>

      {sp.error && sp.create !== "1" && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{sp.error}</div>
      )}
      {(sp.added || sp.saved || sp.deleted) && (
        <div className="rounded-xl bg-primary-soft px-4 py-3 text-sm text-primary-dark">
          บันทึกการตั้งค่า Level แล้ว
        </div>
      )}

      <Card className="text-sm text-ink/60">
        Level 1 ต้องเริ่มที่ 0 XP และค่า XP ของ Level ถัดไปต้องสูงกว่า Level ก่อนหน้าเสมอ
        คะแนน XP ใช้ยอดแต้มสะสมจากระบบเดิม จึงมีผลกับโปรไฟล์ผู้ใช้งานทันที
      </Card>

      <div className="space-y-3">
        {levels.map((level) => (
          <form key={level.id} action={updateLevel}>
            <input type="hidden" name="id" value={level.id} />
            <Card className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Badge className="bg-ink text-paper">Level {level.level_number}</Badge>
                  <span className="font-display font-bold">{level.name}</span>
                </div>
                <span className="font-mono text-sm text-primary-dark tnum">
                  {level.min_xp.toLocaleString("th-TH")} XP
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[120px_minmax(0,1fr)_minmax(180px,0.7fr)]">
                <div>
                  <Label>Level</Label>
                  <Input
                    name="level_number"
                    type="number"
                    min={1}
                    max={999}
                    defaultValue={level.level_number}
                    required
                  />
                </div>
                <div>
                  <Label>ชื่อ Level</Label>
                  <Input name="name" maxLength={50} defaultValue={level.name} required />
                </div>
                <div>
                  <Label>XP ขั้นต่ำเพื่อปลดล็อก</Label>
                  <Input
                    name="min_xp"
                    type="number"
                    min={0}
                    max={1000000000}
                    defaultValue={level.min_xp}
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                {level.level_number !== 1 && (
                  <ConfirmDeleteButton
                    title="ยืนยันการลบ Level"
                    description={`ต้องการลบ Level ${level.level_number} “${level.name}” ใช่หรือไม่? ผู้ใช้งานจะถูกคำนวณ Level ใหม่ทันที`}
                    formAction={deleteLevel}
                  />
                )}
                <Button type="submit" icon="save">บันทึก Level นี้</Button>
              </div>
            </Card>
          </form>
        ))}
      </div>

    </div>
  );
}
