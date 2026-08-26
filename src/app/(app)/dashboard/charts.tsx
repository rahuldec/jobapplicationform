"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardHeader } from "@/components/ui/primitives";
import { shortenJobLabels } from "@/lib/job-labels";

const tooltipStyle = {
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  background: "#ffffff",
  fontSize: 12,
  boxShadow: "0 4px 16px rgba(15,23,42,0.08)",
};

const ROW_HEIGHT = 34;
const MIN_CHART_HEIGHT = 160;

export function ApplicationsByJobChart({ data }: { data: { jobTitle: string; count: number }[] }) {
  const labels = shortenJobLabels(data.map((d) => d.jobTitle));
  const rows = data.map((d, i) => ({ ...d, label: labels[i] }));
  const chartHeight = Math.max(MIN_CHART_HEIGHT, rows.length * ROW_HEIGHT);

  return (
    <Card>
      <CardHeader title="Applications by job" description="Where the pipeline is concentrated." />
      <div className="px-5 py-4">
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={{ stroke: "#e2e8f0" }} />
            <YAxis type="category" dataKey="label" tick={{ fontSize: 11, fill: "#334155" }} tickLine={false} axisLine={false} width={110} />
            <Tooltip
              contentStyle={tooltipStyle}
              cursor={{ fill: "rgba(234,88,12,0.06)" }}
              labelFormatter={(_, payload) => payload?.[0]?.payload?.jobTitle ?? ""}
            />
            <Bar dataKey="count" name="Applications" fill="#ea580c" radius={[0, 6, 6, 0]} barSize={16} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
