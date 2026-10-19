// รูปแบบข้อมูลของปุ่ม "บันทึกทั้งหมด": รวมหลายฟอร์มเป็น FormData เดียว
// key ของแต่ละฟอร์มมี prefix "<ลำดับ>:" และจำนวนฟอร์มอยู่ใน BULK_COUNT_KEY
export const BULK_COUNT_KEY = "__bulk_count";
export const BULK_NONCE_KEY = "__bulk_nonce";
export const MAX_BULK_ITEMS = 200;

export function bulkFieldName(index: number, name: string) {
  return `${index}:${name}`;
}

// แยกกลับเป็น FormData ต่อรายการ เพื่อส่งเข้า logic บันทึกเดิมของแต่ละรายการ
export function splitBulkFormData(formData: FormData): FormData[] {
  const count = Number(formData.get(BULK_COUNT_KEY));
  if (!Number.isInteger(count) || count < 1 || count > MAX_BULK_ITEMS) return [];

  const items = Array.from({ length: count }, () => new FormData());
  for (const [key, value] of formData.entries()) {
    const match = /^(\d+):(.+)$/.exec(key);
    if (!match) continue;
    const index = Number(match[1]);
    if (index < count) items[index].append(match[2], value);
  }
  return items;
}

// URL หลังบันทึกทั้งหมด: ใส่จำนวนรายการและ nonce ให้ URL เปลี่ยนทุกครั้ง
// หน้าจึงรู้ว่าบันทึกเสร็จแม้บันทึกซ้ำจำนวนเท่าเดิม
export function bulkSuccessUrl(path: string, formData: FormData, savedCount: number) {
  const nonce = String(formData.get(BULK_NONCE_KEY) ?? "").replace(/\D/g, "").slice(0, 20);
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}bulk_saved=${savedCount}${nonce ? `&bulk=${nonce}` : ""}`;
}
