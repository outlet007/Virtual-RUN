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
import { tx, type Locale } from "@/lib/i18n/shared";

export function PersonalDistanceChart({ data, locale }: { data: PersonalDistanceSeriesPoint[]; locale: Locale }) {
  const runKm = data.reduce((sum, point) => sum + point.runKm, 0);
  const walkKm = data.reduce((sum, point) => sum + point.walkKm, 0);
  const totalKm = runKm + walkKm;

  if (totalKm === 0) {
    return (
      <div className="flex min-h-56 items-center justify-center text-center text-sm text-ink/50">
        {tx(locale, "ยังไม่มีระยะวิ่งหรือเดินที่อนุมัติใน 30 วันล่าสุด", "No approved running or walking distance in the last 30 days")}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-x-5 gap-y-2 text-sm" aria-label={tx(locale, "คำอธิบายสีของกราฟ", "Chart legend")}>
        <span className="inline-flex items-center gap-2">
          <span className="size-3 rounded-sm bg-primary" aria-hidden="true" />
          {tx(locale, "วิ่ง", "Run")} {runKm.toLocaleString(locale === "en" ? "en-US" : "th-TH", { maximumFractionDigits: 2 })} {tx(locale, "กม.", "km")}
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="size-3 rounded-sm bg-ink" aria-hidden="true" />
          {tx(locale, "เดิน", "Walk")} {walkKm.toLocaleString(locale === "en" ? "en-US" : "th-TH", { maximumFractionDigits: 2 })} {tx(locale, "กม.", "km")}
        </span>
      </div>

      <div
        className="h-72 w-full min-w-0"
        role="img"
        aria-label={tx(locale, "กราฟระยะทาง 30 วันล่าสุด", "Distance chart for the last 30 days")}
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
                Number(value).toLocaleString(locale === "en" ? "en-US" : "th-TH", { maximumFractionDigits: 2 }) + " " + tx(locale, "กม.", "km"),
                name === "runKm" ? tx(locale, "วิ่ง", "Run") : tx(locale, "เดิน", "Walk"),
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
        <summary className="cursor-pointer font-semibold">{tx(locale, "ดูข้อมูลตัวเลขของกราฟ", "View chart data")}</summary>
        <div className="mt-3 max-h-56 overflow-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-lane text-ink/55">
                <th className="py-2 pr-4 font-medium">{tx(locale, "วันที่", "Date")}</th>
                <th className="py-2 text-right font-medium">{tx(locale, "วิ่ง", "Run")}</th>
                <th className="py-2 text-right font-medium">{tx(locale, "เดิน", "Walk")}</th>
                <th className="py-2 text-right font-medium">{tx(locale, "รวม", "Total")}</th>
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
