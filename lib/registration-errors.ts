type RegistrationDatabaseError = {
  code?: string;
  message?: string;
};

export function getRegistrationErrorMessage(error: RegistrationDatabaseError): string {
  if (error.code === "23505") return "คุณลงทะเบียนแพ็กเกจนี้ไปแล้ว";
  if (error.message === "shipping_address_required") return "กรุณากรอกที่อยู่จัดส่งให้ครบถ้วน";
  if (error.message === "package_not_found" || error.message === "event_not_found") {
    return "ไม่พบแพ็กเกจ";
  }
  if (error.message === "event_registration_closed" || error.code === "23514") {
    return "งานนี้สิ้นสุดแล้วและไม่เปิดรับสมัคร";
  }
  return error.message || "ไม่สามารถสร้างใบสมัครได้";
}
