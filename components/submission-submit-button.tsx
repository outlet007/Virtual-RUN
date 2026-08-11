"use client";

import { LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui";
import { tx, type Locale } from "@/lib/i18n/shared";

export function SubmissionSubmitButton({ locale }: { locale: Locale }) {
  const { pending } = useFormStatus();

  return (
    <Button className="w-full" type="submit" icon={pending ? undefined : "upload"} disabled={pending}>
      {pending ? (
        <>
          <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
          {tx(locale, "กำลังอ่านและตรวจสอบรูป...", "Reading and validating image...")}
        </>
      ) : (
        tx(locale, "ตรวจสอบและบันทึกผล", "Validate and submit")
      )}
    </Button>
  );
}
