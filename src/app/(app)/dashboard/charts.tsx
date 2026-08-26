"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardHeader } from "@/components/ui/primitives";

const tooltipStyle = {
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  background: "#ffffff",
  fontSize: 12,
  boxShadow: "0 4px 16px rgba(15,23,42,0.08)",
};

export function ApplicationsByJobChart({ data }: { data: { jobTitle: string; count: number }[] }) {
  const trimmed = data.map((d) => ({ ...d, label: d.jobTitle.replace(/\s*\(2026 Intake\)$/, "").replace(/^Assistant Professor\s*—\s*/, "") }));
  return (
    <Card>
      <CardHeader title="Applications by job" description="Where the pipeline is concentrated." />
      <div className="px-5 py-4">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={trimmed} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={{ stroke: "#e2e8f0" }} />
            <YAxis type="category" dataKey="label" tick={{ fontSize: 11, fill: "#334155" }} tickLine={false} axisLine={false} width={90} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(234,88,12,0.06)" }} />
            <Bar dataKey="count" name="Applications" fill="#ea580c" radius={[0, 6, 6, 0]} barSize={16} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
