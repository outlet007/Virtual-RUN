"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PersonalDistanceSeriesPoint } from "@/lib/personal-stats";

export function PersonalDistanceChart({ data }: { data: PersonalDistanceSeriesPoint[] }) {
  const runKm = data.reduce((sum, point) => sum + point.runKm, 0);
  const walkKm = data.reduce((sum, point) => sum + point.walkKm, 0);
  const totalKm = runKm + walkKm;

  if (totalKm === 0) {
    return (
      <div className="flex min-h-56 items-center justify-center text-center text-sm text-ink/50">
        ยังไม่มีระยะวิ่งหรือเดินที่อนุมัติใน 30 วันล่าสุด
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-x-5 gap-y-2 text-sm" aria-label="คำอธิบายสีของกราฟ">
        <span className="inline-flex items-center gap-2">
          <span className="size-3 rounded-sm bg-primary" aria-hidden="true" />
          วิ่ง {runKm.toLocaleString("th-TH", { maximumFractionDigits: 2 })} กม.
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="size-3 rounded-sm bg-ink" aria-hidden="true" />
          เดิน {walkKm.toLocaleString("th-TH", { maximumFractionDigits: 2 })} กม.
        </span>
      </div>

      <div
        className="h-72 w-full min-w-0"
        role="img"
        aria-label={`กราฟระยะทาง 30 วันล่าสุด รวม ${totalKm.toLocaleString("th-TH", { maximumFractionDigits: 2 })} กิโลเมตร แยกเป็นวิ่งและเดิน`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 12, right: 8, left: -14, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(12, 17, 29, 0.1)" vertical={false} />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
              tick={{ fill: "rgba(12, 17, 29, 0.58)", fontSize: 11 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              width={46}
              tick={{ fill: "rgba(12, 17, 29, 0.58)", fontSize: 11 }}
              tickFormatter={(value) => Number(value).toLocaleString("th-TH")}
            />
            <Tooltip
              cursor={{ fill: "rgba(12, 17, 29, 0.05)" }}
              formatter={(value, name) => [
                `${Number(value).toLocaleString("th-TH", { maximumFractionDigits: 2 })} กม.`,
                name === "runKm" ? "วิ่ง" : "เดิน",
              ]}
              labelStyle={{ color: "#0C111D", fontWeight: 700 }}
            />
            <Bar dataKey="runKm" stackId="distance" fill="var(--color-primary)" maxBarSize={28} />
            <Bar
              dataKey="walkKm"
              stackId="distance"
              fill="var(--color-ink)"
              radius={[5, 5, 0, 0]}
              maxBarSize={28}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <details className="mt-3 rounded-xl border border-lane bg-white/60 px-4 py-3 text-sm">
        <summary className="cursor-pointer font-semibold">ดูข้อมูลตัวเลขของกราฟ</summary>
        <div className="mt-3 max-h-56 overflow-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-lane text-ink/55">
                <th className="py-2 pr-4 font-medium">วันที่</th>
                <th className="py-2 text-right font-medium">วิ่ง</th>
                <th className="py-2 text-right font-medium">เดิน</th>
                <th className="py-2 text-right font-medium">รวม</th>
              </tr>
            </thead>
            <tbody>
              {data.map((point) => (
                <tr key={point.key} className="border-b border-lane/60 last:border-0">
                  <td className="py-2 pr-4">{point.label}</td>
                  <td className="py-2 text-right font-mono tnum">{point.runKm.toLocaleString("th-TH")}</td>
                  <td className="py-2 text-right font-mono tnum">{point.walkKm.toLocaleString("th-TH")}</td>
                  <td className="py-2 text-right font-mono font-semibold tnum">{point.totalKm.toLocaleString("th-TH")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
