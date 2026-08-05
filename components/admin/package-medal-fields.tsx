"use client";

import { useState } from "react";
import { Label, Select } from "@/components/ui";

type MedalOption = {
  id: string;
  name: string;
};

type PackageMedalFieldsProps = {
  digitalMedals: MedalOption[];
  physicalMedals: MedalOption[];
  defaultDigitalMedalId?: string | null;
  defaultPhysicalMedalId?: string | null;
  defaultHasPhysicalMedal?: boolean;
};

export function PackageMedalFields({
  digitalMedals,
  physicalMedals,
  defaultDigitalMedalId = null,
  defaultPhysicalMedalId = null,
  defaultHasPhysicalMedal = false,
}: PackageMedalFieldsProps) {
  const [hasDigitalMedal, setHasDigitalMedal] = useState(Boolean(defaultDigitalMedalId));
  const [hasPhysicalMedal, setHasPhysicalMedal] = useState(
    defaultHasPhysicalMedal || Boolean(defaultPhysicalMedalId),
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            name="has_digital_medal"
            checked={hasDigitalMedal}
            onChange={(event) => setHasDigitalMedal(event.target.checked)}
          />
          มีเหรียญดิจิทัล
        </label>
        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            name="has_physical_medal"
            checked={hasPhysicalMedal}
            onChange={(event) => setHasPhysicalMedal(event.target.checked)}
          />
          มีเหรียญจริง
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {hasDigitalMedal && (
          <div>
            <Label>เหรียญดิจิทัลที่ผูกกับแพ็กเกจ</Label>
            <Select name="digital_medal_id" defaultValue={defaultDigitalMedalId ?? ""} required>
              <option value="">เลือกเหรียญดิจิทัล</option>
              {digitalMedals.map((medal) => (
                <option key={medal.id} value={medal.id}>
                  {medal.name}
                </option>
              ))}
            </Select>
          </div>
        )}

        {hasPhysicalMedal && (
          <div>
            <Label>เหรียญจริงที่ผูกกับแพ็กเกจ</Label>
            <Select name="physical_medal_id" defaultValue={defaultPhysicalMedalId ?? ""} required>
              <option value="">เลือกเหรียญจริง</option>
              {physicalMedals.map((medal) => (
                <option key={medal.id} value={medal.id}>
                  {medal.name}
                </option>
              ))}
            </Select>
          </div>
        )}
      </div>
    </div>
  );
}