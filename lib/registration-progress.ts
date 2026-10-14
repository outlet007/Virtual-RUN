export type RegistrationRunProgressStatus =
  | "registration_pending"
  | "not_started"
  | "in_progress"
  | "completed"
  | "cancelled";

export const registrationRunStatusLabel: Record<RegistrationRunProgressStatus, string> = {
  registration_pending: "รอยืนยันใบสมัคร",
  not_started: "ยังไม่มีผลอนุมัติ",
  in_progress: "กำลังสะสมระยะ",
  completed: "วิ่งครบแล้ว",
  cancelled: "ยกเลิก",
};

export type RegistrationRunProgress = {
  status: RegistrationRunProgressStatus;
  approvedDistanceKm: number;
  targetDistanceKm: number;
};

export function getRegistrationRunProgress({
  registrationStatus,
  approvedDistanceKm,
  targetDistanceKm,
}: {
  registrationStatus: string;
  approvedDistanceKm: number;
  targetDistanceKm: number;
}): RegistrationRunProgress {
  const approvedDistance = Math.max(0, Number(approvedDistanceKm) || 0);
  const targetDistance = Math.max(0, Number(targetDistanceKm) || 0);

  if (registrationStatus === "cancelled") {
    return {
      status: "cancelled",
      approvedDistanceKm: approvedDistance,
      targetDistanceKm: targetDistance,
    };
  }

  if (registrationStatus === "pending") {
    return {
      status: "registration_pending",
      approvedDistanceKm: approvedDistance,
      targetDistanceKm: targetDistance,
    };
  }

  const status =
    targetDistance > 0 && approvedDistance >= targetDistance
      ? "completed"
      : approvedDistance > 0
        ? "in_progress"
        : "not_started";

  return {
    status,
    approvedDistanceKm: approvedDistance,
    targetDistanceKm: targetDistance,
  };
}
