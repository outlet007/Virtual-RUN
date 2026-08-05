import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { deleteMedal } from "@/lib/actions/admin";

export function MedalDeleteButton({ medalName }: { medalName: string }) {
  return (
    <ConfirmDeleteButton
      formAction={deleteMedal}
      triggerLabel="ลบเหรียญ"
      title="ยืนยันการลบเหรียญ"
      description={`ต้องการลบเหรียญ "${medalName}" ใช่หรือไม่? ผู้ใช้ที่เคยได้รับเหรียญนี้จะเสียสถานะเหรียญดังกล่าว`}
    />
  );
}