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
import type { RegistrationSeriesPoint } from "@/lib/admin/day8";

export function RegistrationTrendChart({ data }: { data: RegistrationSeriesPoint[] }) {
  const total = data.reduce((sum, point) => sum + point.registrations, 0);

  return (
    <div>
      <div
        className="h-72 min-w-[640px]"
        role="img"
        aria-label={`กราฟจำนวนผู้สมัคร รวม ${total.toLocaleString("th-TH")} คนในช่วงที่เลือก`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 12, right: 12, left: -12, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(12, 17, 29, 0.1)" vertical={false} />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
              tick={{ fill: "rgba(12, 17, 29, 0.58)", fontSize: 11 }}
            />
            <YAxis
              allowDecimals={false}
              axisLine={false}
              tickLine={false}
              width={42}
              tick={{ fill: "rgba(12, 17, 29, 0.58)", fontSize: 11 }}
            />
            <Tooltip
              cursor={{ fill: "rgba(18, 183, 106, 0.08)" }}
              formatter={(value) => [`${Number(value).toLocaleString("th-TH")} คน`, "ผู้สมัคร"]}
              labelStyle={{ color: "#0C111D", fontWeight: 700 }}
            />
            <Bar dataKey="registrations" fill="#12B76A" radius={[6, 6, 0, 0]} maxBarSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <details className="mt-3 rounded-xl border border-lane bg-white/60 px-4 py-3 text-sm">
        <summary className="cursor-pointer font-semibold">ดูข้อมูลตัวเลขของกราฟ</summary>
        <div className="mt-3 max-h-56 overflow-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-lane text-ink/55">
                <th className="py-2 pr-4 font-medium">ช่วงเวลา</th>
                <th className="py-2 text-right font-medium">ผู้สมัคร</th>
              </tr>
            </thead>
            <tbody>
              {data.map((point) => (
                <tr key={point.key} className="border-b border-lane/60 last:border-0">
                  <td className="py-2 pr-4">{point.label}</td>
                  <td className="py-2 text-right font-mono tnum">
                    {point.registrations.toLocaleString("th-TH")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
