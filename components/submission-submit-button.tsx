"use client";

import { LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui";

export function SubmissionSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button className="w-full" type="submit" icon={pending ? undefined : "upload"} disabled={pending}>
      {pending ? (
        <>
          <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
          กำลังอ่านและตรวจสอบรูป...
        </>
      ) : (
        "ตรวจสอบและบันทึกผล"
      )}
    </Button>
  );
}
