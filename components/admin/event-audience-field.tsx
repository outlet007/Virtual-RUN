import { Label, Select } from "@/components/ui";
import { EVENT_AUDIENCES, eventAudienceLabel, getEventAudienceDomains } from "@/lib/event-audience";

// ใช้ร่วมกันในฟอร์มสร้างงาน (modal และหน้า /admin/events/new) และฟอร์มแก้ไขงาน
export function EventAudienceField({ defaultValue = "all" }: { defaultValue?: string }) {
  return (
    <div>
      <Label>สำหรับ</Label>
      <Select name="audience" defaultValue={defaultValue}>
        {EVENT_AUDIENCES.map((audience) => (
          <option key={audience} value={audience}>
            {eventAudienceLabel[audience].th}
            {audience === "all" ? "" : ` (${getEventAudienceDomains(audience).join(" หรือ ")})`}
          </option>
        ))}
      </Select>
      <p className="mt-1 text-xs text-ink/45">
        ผู้สมัครต้องเข้าสู่ระบบด้วย Google ของมหาวิทยาลัย และมีผลกับการสมัครใหม่เท่านั้น
      </p>
    </div>
  );
}
