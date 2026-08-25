"use client";

import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { APPLICATION_STATUS_LABELS, type ApplicationStatus } from "@/lib/enums";

const STATUS_COLORS: Record<ApplicationStatus, string> = {
  draft: "#94a3b8",
  submitted: "#f59e0b",
  under_review: "#f59e0b",
  shortlisted: "#8b5cf6",
  interview_scheduled: "#3465c9",
  interviewed: "#3465c9",
  selected: "#10b981",
  rejected: "#ef4444",
  withdrawn: "#94a3b8",
};

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.7)",
  background: "rgba(255,255,255,0.9)",
  fontSize: 12,
  boxShadow: "0 4px 16px rgba(15,23,42,0.1)",
};

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/55 p-4 shadow-lg shadow-slate-900/10 backdrop-blur-lg">
      <p className="mb-3 text-sm font-bold text-slate-900">{title}</p>
      {children}
    </div>
  );
}

export function ApplicationsTrendChart({ data }: { data: { date: string; count: number }[] }) {
  return (
    <ChartCard title="Applications over time">
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3465c9" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#3465c9" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={{ stroke: "#e2e8f0" }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} width={28} />
          <Tooltip contentStyle={tooltipStyle} />
          <Area type="monotone" dataKey="count" name="Applications" stroke="#1b449c" strokeWidth={2} fill="url(#trendFill)" />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function ApplicationsByJobChart({ data }: { data: { jobTitle: string; count: number }[] }) {
  const trimmed = data.map((d) => ({ ...d, label: d.jobTitle.replace(/\s*\(2026 Intake\)$/, "").replace(/^Assistant Professor\s*—\s*/, "") }));
  return (
    <ChartCard title="Applications by job">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={trimmed} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={{ stroke: "#e2e8f0" }} />
          <YAxis type="category" dataKey="label" tick={{ fontSize: 11, fill: "#334155" }} tickLine={false} axisLine={false} width={90} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(27,68,156,0.06)" }} />
          <Bar dataKey="count" name="Applications" fill="#1b449c" radius={[0, 6, 6, 0]} barSize={16} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function ApplicationsByStatusChart({ byStatus }: { byStatus: Record<ApplicationStatus, number> }) {
  const data = (Object.keys(byStatus) as ApplicationStatus[])
    .map((status) => ({ status, label: APPLICATION_STATUS_LABELS[status], value: byStatus[status] }))
    .filter((d) => d.value > 0);

  return (
    <ChartCard title="Applications by status">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
          <Pie data={data} dataKey="value" nameKey="label" innerRadius={48} outerRadius={80} paddingAngle={2}>
            {data.map((d) => (
              <Cell key={d.status} fill={STATUS_COLORS[d.status]} stroke="rgba(255,255,255,0.8)" strokeWidth={1} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-1 flex flex-wrap justify-center gap-x-3 gap-y-1">
        {data.map((d) => (
          <span key={d.status} className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[d.status] }} />
            {d.label} ({d.value})
          </span>
        ))}
      </div>
    </ChartCard>
  );
}
