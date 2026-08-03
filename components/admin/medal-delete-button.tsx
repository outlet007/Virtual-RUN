"use client";

import { Button } from "@/components/ui";
import { deleteMedal } from "@/lib/actions/admin";

export function MedalDeleteButton({ medalName }: { medalName: string }) {
  return (
    <Button
      type="submit"
      variant="ghost"
      formAction={deleteMedal}
      className="border-red-200 text-red-700 hover:bg-red-50"
      onClick={(event) => {
        const confirmed = window.confirm(
          [
            "ยืนยันการลบเหรียญ \"",
            medalName,
            "\"? ผู้ใช้ที่เคยได้รับเหรียญนี้จะเสียสถานะเหรียญดังกล่าว",
          ].join(""),
        );

        if (!confirmed) event.preventDefault();
      }}
    >
      ลบเหรียญ
    </Button>
  );
}
