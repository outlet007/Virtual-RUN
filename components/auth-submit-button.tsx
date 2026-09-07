"use client";

import { LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";
import { Button, type ButtonIconName } from "@/components/ui";

export function AuthSubmitButton({
  label,
  pendingLabel,
  icon,
  disabled = false,
}: {
  label: string;
  pendingLabel: string;
  icon: ButtonIconName;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      className="w-full"
      type="submit"
      icon={pending ? undefined : icon}
      disabled={disabled || pending}
    >
      {pending ? (
        <>
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          {pendingLabel}
        </>
      ) : (
        label
      )}
    </Button>
  );
}
