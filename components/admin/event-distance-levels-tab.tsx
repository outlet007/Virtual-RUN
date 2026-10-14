import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { Badge, Button, Card, Input, Label, Select } from "@/components/ui";
import {
  createEventDistanceLevel,
  deleteEventDistanceLevel,
  updateEventDistanceLevel,
} from "@/lib/actions/admin";
import type { EventDistanceLevel } from "@/lib/event-distance-levels";

type LevelRow = EventDistanceLevel & {
  digital_medal_id: string | null;
  reward_description: string | null;
  reward_description_en: string | null;
  bonus_points: number;
};

type MedalOption = {
  id: string;
  name: string;
};

function LevelFields({
  level,
  medals,
}: {
  level?: LevelRow;
  medals: MedalOption[];
}) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>ชื่อระดับ (ไทย)</Label>
          <Input name="name" defaultValue={level?.name ?? ""} required />
        </div>
        <div>
          <Label>Level name (English)</Label>
          <Input name="name_en" defaultValue={level?.name_en ?? ""} />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <Label>ระยะสะสมที่ต้องถึง (km)</Label>
          <Input
            name="target_distance_km"
            type="number"
            min="0.01"
            step="0.01"
            defaultValue={level?.target_distance_km ?? ""}
            required
          />
        </div>
        <div>
          <Label>ลำดับแสดงผล</Label>
          <Input
            name="sort_order"
            type="number"
            min="0"
            step="1"
            defaultValue={level?.sort_order ?? 0}
            required
          />
        </div>
        <div>
          <Label>คะแนนโบนัส</Label>
          <Input
            name="bonus_points"
            type="number"
            min="0"
            step="1"
            defaultValue={level?.bonus_points ?? 0}
            required
          />
        </div>
      </div>
      <div>
        <Label>เหรียญดิจิทัลเมื่อผ่านระดับ</Label>
        <Select name="digital_medal_id" defaultValue={level?.digital_medal_id ?? ""}>
          <option value="">ไม่กำหนด</option>
          {medals.map((medal) => (
            <option key={medal.id} value={medal.id}>
              {medal.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>รายละเอียดรางวัล (ไทย)</Label>
          <Input
            name="reward_description"
            defaultValue={level?.reward_description ?? ""}
            placeholder="เช่น เสื้อ Finisher หรือสิทธิ์จับรางวัล"
          />
        </div>
        <div>
          <Label>Reward description (English)</Label>
          <Input
            name="reward_description_en"
            defaultValue={level?.reward_description_en ?? ""}
          />
        </div>
      </div>
    </>
  );
}

export function EventDistanceLevelsTab({
  eventId,
  eventMode,
  levels,
  medals,
  added,
  saved,
  deleted,
}: {
  eventId: string;
  eventMode: string;
  levels: LevelRow[];
  medals: MedalOption[];
  added?: boolean;
  saved?: boolean;
  deleted?: boolean;
}) {
  if (eventMode !== "distance_levels") {
    return (
      <Card className="border-amber-200 bg-amber-50 text-amber-900">
        เปลี่ยนรูปแบบงานเป็น “ระดับระยะสะสม” จากปุ่มแก้ไขงานก่อน จึงจะเพิ่มระดับระยะได้
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-display text-lg font-bold">ระดับระยะของงาน</h3>
        <p className="mt-1 text-sm text-ink/50">
          ระบบนับเฉพาะผลวิ่งที่อนุมัติแล้ว ผู้สมัครจะผ่านทุกระดับที่ระยะสะสมถึงโดยอัตโนมัติ
        </p>
      </div>

      {(added || saved || deleted) && (
        <div className="rounded-xl bg-primary-soft px-4 py-3 text-sm text-primary-dark">
          {added ? "เพิ่มระดับแล้ว" : saved ? "บันทึกระดับแล้ว" : "ลบระดับแล้ว"}
        </div>
      )}

      {levels.map((level, index) => (
        <form key={level.id} action={updateEventDistanceLevel}>
          <input type="hidden" name="id" value={level.id} />
          <input type="hidden" name="event_id" value={eventId} />
          <Card className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-display font-bold">{level.name}</span>
                <Badge className="bg-sky-100 text-sky-700">ระดับ {index + 1}</Badge>
                <Badge className="bg-lane text-muted">{level.target_distance_km} km</Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" variant="ghost" icon="save">
                  บันทึก
                </Button>
                <ConfirmDeleteButton
                  description={`ต้องการลบระดับ “${level.name}” ใช่หรือไม่? ระดับที่มีผู้สำเร็จแล้วจะลบไม่ได้`}
                  formAction={deleteEventDistanceLevel}
                />
              </div>
            </div>
            <LevelFields level={level} medals={medals} />
          </Card>
        </form>
      ))}

      <form action={createEventDistanceLevel}>
        <input type="hidden" name="event_id" value={eventId} />
        <Card className="space-y-3 border-dashed">
          <h4 className="font-display font-bold">เพิ่มระดับใหม่</h4>
          <LevelFields medals={medals} />
          <Button type="submit" icon="add">
            เพิ่มระดับ
          </Button>
        </Card>
      </form>
    </div>
  );
}
