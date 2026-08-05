import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { deletePhysicalMedal } from "@/lib/actions/admin";

export function PhysicalMedalDeleteButton({ medalName }: { medalName: string }) {
  return (
    <ConfirmDeleteButton
      formAction={deletePhysicalMedal}
      triggerLabel="ลบเหรียญจริง"
      title="ยืนยันการลบเหรียญจริง"
      description={`ต้องการลบเหรียญจริง "${medalName}" ใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้`}
    />
  );
}