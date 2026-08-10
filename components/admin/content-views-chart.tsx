"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type ContentDailyAnalyticsPoint = {
  date: string;
  label: string;
  views: number;
  uniqueVisitors: number;
};

export function ContentViewsChart({ data }: { data: ContentDailyAnalyticsPoint[] }) {
  const totalViews = data.reduce((sum, point) => sum + point.views, 0);
  return (
    <div className="space-y-3">
      <div
        className="h-72 w-full min-w-0"
        role="img"
        aria-label={`กราฟยอดเข้าชมบทความ 30 วัน รวม ${totalViews.toLocaleString("th-TH")} ครั้ง`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E7E5DF" vertical={false} />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "#585858" }}
              minTickGap={24}
            />
            <YAxis
              allowDecimals={false}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "#585858" }}
            />
            <Tooltip
              formatter={(value, name) => [
                Number(value).toLocaleString("th-TH"),
                name === "views" ? "การเข้าชม" : "ผู้เยี่ยมชม",
              ]}
              labelFormatter={(_label, payload) => payload?.[0]?.payload?.date ?? ""}
            />
            <Bar
              dataKey="views"
              fill="var(--color-primary)"
              radius={[5, 5, 0, 0]}
              maxBarSize={28}
            />
            <Line
              type="monotone"
              dataKey="uniqueVisitors"
              stroke="var(--color-ink)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap gap-4 text-xs text-ink/55" aria-hidden="true">
        <span className="inline-flex items-center gap-2">
          <span className="size-3 rounded-sm bg-primary" /> การเข้าชม
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-0.5 w-4 bg-ink" /> ผู้เยี่ยมชมไม่ซ้ำ
        </span>
      </div>
      <details className="text-sm text-ink/60">
        <summary className="cursor-pointer font-semibold">ดูข้อมูลตัวเลข 30 วัน</summary>
        <div className="mt-2 max-h-64 overflow-auto rounded-xl border border-lane">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-lane/80">
              <tr>
                <th className="px-3 py-2">วันที่</th>
                <th className="px-3 py-2 text-right">เข้าชม</th>
                <th className="px-3 py-2 text-right">ผู้เยี่ยมชม</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-lane">
              {data.map((point) => (
                <tr key={point.date}>
                  <td className="px-3 py-2">{point.date}</td>
                  <td className="px-3 py-2 text-right font-mono tnum">{point.views}</td>
                  <td className="px-3 py-2 text-right font-mono tnum">{point.uniqueVisitors}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
