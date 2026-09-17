"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { AppleCard, AppleCardHeader } from "./apple-ui";
import { shortenJobLabels } from "@/lib/job-labels";

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid rgba(15,23,42,0.06)",
  background: "rgba(255,255,255,0.95)",
  fontSize: 12,
  boxShadow: "0 12px 28px -12px rgba(15,23,42,0.18)",
  backdropFilter: "blur(8px)",
};

const ROW_HEIGHT = 34;
const MIN_CHART_HEIGHT = 160;

export function ApplicationsByJobChart({ data }: { data: { jobTitle: string; count: number }[] }) {
  const labels = shortenJobLabels(data.map((d) => d.jobTitle));
  const rows = data.map((d, i) => ({ ...d, label: labels[i] }));
  const chartHeight = Math.max(MIN_CHART_HEIGHT, rows.length * ROW_HEIGHT);

  return (
    <AppleCard>
      <AppleCardHeader title="Applications by job" description="Where the pipeline is concentrated." />
      <div className="px-6 pb-6">
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.06)" horizontal={false} />
            <XAxis
              type="number"
              allowDecimals={false}
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              tickLine={false}
              axisLine={{ stroke: "rgba(15,23,42,0.08)" }}
            />
            <YAxis type="category" dataKey="label" tick={{ fontSize: 12, fill: "#475569" }} tickLine={false} axisLine={false} width={110} />
            <Tooltip
              contentStyle={tooltipStyle}
              cursor={{ fill: "rgba(234,88,12,0.06)" }}
              labelFormatter={(_, payload) => payload?.[0]?.payload?.jobTitle ?? ""}
            />
            <Bar dataKey="count" name="Applications" fill="#ea580c" radius={[0, 8, 8, 0]} barSize={16} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </AppleCard>
  );
}
