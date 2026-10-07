"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Card, CardHeader } from "@/components/ui/primitives";
import { shortenJobLabels } from "@/lib/job-labels";
import type { ChartMapping } from "../../../../prisma/sheet-import/types";
import { useEffect, useState } from "react";

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
    <Card>
      <CardHeader title="Applications by job" description="Where the pipeline is concentrated." />
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
    </Card>
  );
}

// ─── Dynamic field charts ────────────────────────────────────────────────────

const PALETTE = [
  "#ea580c", "#3b82f6", "#10b981", "#8b5cf6",
  "#f59e0b", "#06b6d4", "#ec4899", "#84cc16",
  "#6366f1", "#14b8a6", "#f97316", "#a855f7",
];

type ChartPoint = { label: string; count: number };

function useFetchChartData(fieldKey: string) {
  const [data, setData] = useState<ChartPoint[] | null>(null);
  useEffect(() => {
    fetch(`/api/dashboard/chart-data?fieldKey=${encodeURIComponent(fieldKey)}`)
      .then((r) => r.json())
      .then((json) => setData(json.data ?? []))
      .catch(() => setData([]));
  }, [fieldKey]);
  return data;
}

function FieldPieChart({ mapping }: { mapping: ChartMapping }) {
  const data = useFetchChartData(mapping.fieldKey);

  return (
    <Card>
      <CardHeader title={mapping.label} description="Distribution across all applicants." />
      <div className="px-6 pb-6">
        {data === null ? (
          <div className="flex h-40 items-center justify-center text-sm text-slate-400">Loading…</div>
        ) : data.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-slate-400">No data yet.</div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={data}
                dataKey="count"
                nameKey="label"
                cx="50%"
                cy="50%"
                outerRadius={90}
                label={({ name, percent }: { name?: string; percent?: number }) =>
                  `${name ?? ""} (${((percent ?? 0) * 100).toFixed(0)}%)`
                }
                labelLine
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}

function FieldBarChart({ mapping }: { mapping: ChartMapping }) {
  const data = useFetchChartData(mapping.fieldKey);
  const chartHeight = data ? Math.max(160, data.length * 34) : 160;

  return (
    <Card>
      <CardHeader title={mapping.label} description="Count per category across all applicants." />
      <div className="px-6 pb-6">
        {data === null ? (
          <div className="flex h-40 items-center justify-center text-sm text-slate-400">Loading…</div>
        ) : data.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-slate-400">No data yet.</div>
        ) : (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.06)" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={{ stroke: "rgba(15,23,42,0.08)" }} />
              <YAxis type="category" dataKey="label" tick={{ fontSize: 12, fill: "#475569" }} tickLine={false} axisLine={false} width={130} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(234,88,12,0.06)" }} />
              <Bar dataKey="count" name="Applicants" fill="#ea580c" radius={[0, 8, 8, 0]} barSize={16} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}

export function DynamicFieldCharts({ mappings }: { mappings: ChartMapping[] }) {
  if (mappings.length === 0) return null;
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      {mappings.map((m, i) =>
        m.chartType === "pie" ? (
          <FieldPieChart key={i} mapping={m} />
        ) : (
          <FieldBarChart key={i} mapping={m} />
        )
      )}
    </div>
  );
}
