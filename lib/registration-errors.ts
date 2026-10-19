type RegistrationDatabaseError = {
  code?: string;
  message?: string;
};

export function getRegistrationErrorMessage(error: RegistrationDatabaseError): string {
  if (error.message === "event_registration_exists") {
    return "คุณสมัครงานระดับระยะนี้แล้ว";
  }
  if (error.message === "event_audience_not_allowed") {
    return "งานนี้เปิดรับเฉพาะบัญชี Google ของมหาวิทยาลัยในกลุ่มที่กำหนด กรุณาเข้าสู่ระบบด้วย Google ของมหาวิทยาลัย";
  }
  if (error.message === "distance_levels_required") {
    return "งานนี้ยังไม่ได้กำหนดระดับระยะ กรุณาติดต่อผู้ดูแลระบบ";
  }
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
