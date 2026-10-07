"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LabelList } from "recharts";
import { Card, CardHeader } from "@/components/ui/primitives";
import type { ChartMapping } from "../../../../prisma/sheet-import/types";
import { useEffect, useState } from "react";
import Link from "next/link";
import { APPLICATION_STATUS_LABELS, VISIBLE_APPLICATION_STATUSES, type ApplicationStatus } from "@/lib/enums";

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid rgba(15,23,42,0.06)",
  background: "rgba(255,255,255,0.95)",
  fontSize: 12,
  boxShadow: "0 12px 28px -12px rgba(15,23,42,0.18)",
  backdropFilter: "blur(8px)",
};

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
  const total = data ? data.reduce((s, d) => s + d.count, 0) : 0;

  return (
    <Card>
      <CardHeader title={mapping.label} description="Distribution across all applicants." />
      <div className="px-6 pb-6">
        {data === null ? (
          <div className="flex h-40 items-center justify-center text-sm text-slate-400">Loading…</div>
        ) : data.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-slate-400">No data yet.</div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={data} dataKey="count" nameKey="label" cx="50%" cy="50%" outerRadius={90}>
                  {data.map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value) => [value, "Applicants"]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-3 space-y-1.5">
              {data.map((d, i) => (
                <div key={i} className="flex items-center justify-between text-[12px]">
                  <span className="flex items-center gap-2 text-slate-600">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: PALETTE[i % PALETTE.length] }} />
                    {d.label}
                  </span>
                  <span className="font-semibold tabular-nums text-slate-900">
                    {d.count} <span className="font-normal text-slate-400">({total > 0 ? ((d.count / total) * 100).toFixed(0) : 0}%)</span>
                  </span>
                </div>
              ))}
            </div>
          </>
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
            <BarChart data={data} layout="vertical" margin={{ top: 4, right: 40, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.06)" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={{ stroke: "rgba(15,23,42,0.08)" }} />
              <YAxis type="category" dataKey="label" tick={{ fontSize: 12, fill: "#475569" }} tickLine={false} axisLine={false} width={130} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(234,88,12,0.06)" }} />
              <Bar dataKey="count" name="Applicants" fill="#ea580c" radius={[0, 8, 8, 0]} barSize={16}>
                <LabelList dataKey="count" position="right" style={{ fontSize: 11, fill: "#475569", fontWeight: 600 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}

function FieldColumnChart({ mapping }: { mapping: ChartMapping }) {
  const data = useFetchChartData(mapping.fieldKey);

  return (
    <Card>
      <CardHeader title={mapping.label} description="Count per category across all applicants." />
      <div className="px-6 pb-6">
        {data === null ? (
          <div className="flex h-40 items-center justify-center text-sm text-slate-400">Loading…</div>
        ) : data.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-slate-400">No data yet.</div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data} margin={{ top: 20, right: 8, left: 0, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.06)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "#475569" }}
                tickLine={false}
                axisLine={{ stroke: "rgba(15,23,42,0.08)" }}
                angle={-40}
                textAnchor="end"
                interval={0}
              />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(234,88,12,0.06)" }} />
              <Bar dataKey="count" name="Applicants" fill="#ea580c" radius={[6, 6, 0, 0]} barSize={28}>
                {data.map((_, i) => (
                  <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                ))}
                <LabelList dataKey="count" position="top" style={{ fontSize: 11, fill: "#475569", fontWeight: 600 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}

const PIPELINE_STATUS_COLOR: Record<ApplicationStatus, string> = {
  draft: "#94a3b8",
  submitted: "#3b82f6",
  under_review: "#f59e0b",
  shortlisted: "#8b5cf6",
  interview_scheduled: "#3465c9",
  interviewed: "#8b5cf6",
  selected: "#10b981",
  rejected: "#ef4444",
  withdrawn: "#94a3b8",
};

export function PipelineByStatus({ byStatus }: { byStatus: Record<ApplicationStatus, number> }) {
  const max = Math.max(1, ...VISIBLE_APPLICATION_STATUSES.map((s) => byStatus[s]));
  return (
    <Card>
      <CardHeader title="Pipeline by status" description="Click a stage to filter Applications." />
      <div className="space-y-4 px-6 pb-6">
        {VISIBLE_APPLICATION_STATUSES.map((status) => {
          const value = byStatus[status];
          return (
            <Link key={status} href={`/applications?status=${status}`} className="group block">
              <div className="mb-1.5 flex items-center justify-between text-[13px]">
                <span className="flex items-center gap-2 font-medium text-slate-500 transition-colors group-hover:text-slate-900">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: PIPELINE_STATUS_COLOR[status] }} />
                  {APPLICATION_STATUS_LABELS[status]}
                </span>
                <span className="font-semibold tabular-nums text-slate-900">{value}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100/80">
                <div
                  className="h-2 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${(value / max) * 100}%`, backgroundColor: PIPELINE_STATUS_COLOR[status] }}
                />
              </div>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}

// The pipeline card always occupies the last slot in the grid alongside
// the admin-configured charts. If there are no configured charts it still
// renders alone in a single-column row.
export function DynamicFieldCharts({
  mappings,
  pipelineData,
}: {
  mappings: ChartMapping[];
  pipelineData: Record<ApplicationStatus, number>;
}) {
  const chartCards = mappings.map((m, i) =>
    m.chartType === "pie" ? (
      <FieldPieChart key={i} mapping={m} />
    ) : m.chartType === "column" ? (
      <FieldColumnChart key={i} mapping={m} />
    ) : (
      <FieldBarChart key={i} mapping={m} />
    )
  );

  // Render all charts + the pipeline card together in a responsive grid.
  const all = [...chartCards, <PipelineByStatus key="pipeline" byStatus={pipelineData} />];
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      {all}
    </div>
  );
}
