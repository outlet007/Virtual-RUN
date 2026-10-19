"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui";
import { BULK_COUNT_KEY, BULK_NONCE_KEY, bulkFieldName } from "@/lib/bulk-form";

// ครอบรายการที่แก้ไขได้ในที่ (form ละรายการ) แล้วเพิ่มปุ่ม "บันทึกทั้งหมด"
// ฟอร์มที่ร่วมต้องมี data-bulk-item และส่งเฉพาะฟอร์มที่ถูกแก้ไขไปยัง action แบบ bulk
// ปุ่มบันทึก/ลบ/ย้ายลำดับรายรายการยังทำงานเหมือนเดิม
// "ถูกแก้ไข" = ค่าปัจจุบันต่างจากค่าที่จำไว้ (รวม hidden input เช่นตำแหน่งรูปและ rich text)
// ค่าที่จำไว้จะอัปเดตเฉพาะฟอร์มที่เพิ่งบันทึก เมื่อหน้ากลับมาโดยไม่มี error

function snapshot(form: HTMLFormElement) {
  const values: string[] = [];
  for (const [name, value] of new FormData(form).entries()) {
    values.push(
      `${name}=${typeof value === "string" ? value : value.size > 0 ? `file:${value.name}:${value.size}` : ""}`,
    );
  }
  return values.join("\n");
}

export function BulkSaveScope({
  action,
  children,
  label = "บันทึกทั้งหมด",
}: {
  action: (formData: FormData) => Promise<void>;
  children: React.ReactNode;
  label?: string;
}) {
  const scopeRef = useRef<HTMLDivElement>(null);
  const initial = useRef(new Map<HTMLFormElement, string>());
  const awaitingSave = useRef<HTMLFormElement[]>([]);
  const searchParams = useSearchParams();
  const [dirtyCount, setDirtyCount] = useState(0);
  const [pending, startTransition] = useTransition();

  const forms = useCallback(
    () =>
      Array.from(
        scopeRef.current?.querySelectorAll<HTMLFormElement>("form[data-bulk-item]") ?? [],
      ),
    [],
  );
  const dirtyForms = useCallback(
    () => forms().filter((form) => initial.current.get(form) !== snapshot(form)),
    [forms],
  );

  // หลังบันทึก (รายรายการหรือทั้งหมด) หน้าจะ redirect กลับมา: ถ้าไม่มี error ให้จำค่าใหม่ของฟอร์มที่บันทึก
  useEffect(() => {
    if (!searchParams.get("error")) {
      for (const form of awaitingSave.current) initial.current.set(form, snapshot(form));
    }
    awaitingSave.current = [];
    for (const form of forms()) {
      if (!initial.current.has(form)) initial.current.set(form, snapshot(form));
    }
    setDirtyCount(dirtyForms().length);
  }, [searchParams, forms, dirtyForms]);

  useEffect(() => {
    const scope = scopeRef.current;
    if (!scope) return;
    const recount = () => setDirtyCount(dirtyForms().length);
    const rememberSubmit = (event: SubmitEvent) => {
      const form = event.target;
      // ปุ่มย้ายลำดับ/ลบใช้ formAction ของตัวเอง ไม่ได้บันทึกค่าที่แก้ในฟอร์ม
      if (event.submitter?.hasAttribute("formaction")) return;
      if (form instanceof HTMLFormElement && form.hasAttribute("data-bulk-item")) {
        awaitingSave.current = [form];
      }
    };
    scope.addEventListener("input", recount);
    scope.addEventListener("change", recount);
    scope.addEventListener("submit", rememberSubmit, true);
    return () => {
      scope.removeEventListener("input", recount);
      scope.removeEventListener("change", recount);
      scope.removeEventListener("submit", rememberSubmit, true);
    };
  }, [dirtyForms]);

  function saveAll() {
    const changed = dirtyForms();
    if (changed.length === 0) return;
    const invalid = changed.find((form) => !form.checkValidity());
    if (invalid) {
      invalid.reportValidity();
      return;
    }

    const payload = new FormData();
    payload.set(BULK_COUNT_KEY, String(changed.length));
    payload.set(BULK_NONCE_KEY, String(Date.now()));
    changed.forEach((form, index) => {
      for (const [name, value] of new FormData(form).entries()) {
        if (typeof value !== "string" && value.size === 0) continue;
        payload.append(bulkFieldName(index, name), value);
      }
    });
    awaitingSave.current = changed;
    startTransition(async () => {
      await action(payload);
    });
  }

  return (
    <div ref={scopeRef} className="space-y-3">
      <div className="sticky top-2 z-10 flex flex-wrap items-center justify-end gap-3 rounded-xl border border-lane bg-paper/95 px-3 py-2 shadow-sm backdrop-blur">
        <p className="text-sm text-ink/55" aria-live="polite">
          {dirtyCount > 0 ? `แก้ไขแล้ว ${dirtyCount} รายการ ยังไม่บันทึก` : "ยังไม่มีรายการที่แก้ไข"}
        </p>
        <Button
          type="button"
          icon="save"
          onClick={saveAll}
          disabled={dirtyCount === 0 || pending}
        >
          {pending ? "กำลังบันทึก..." : dirtyCount > 0 ? `${label} (${dirtyCount})` : label}
        </Button>
      </div>
      {children}
    </div>
  );
}
