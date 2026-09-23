import Link from "next/link";
import { getCurrentTenant } from "@/lib/tenant";
import { getDashboardData } from "@/lib/queries/dashboard";
import { Card, CardHeader, EmptyState } from "@/components/ui/primitives";
import { APPLICATION_STATUS_LABELS, VISIBLE_APPLICATION_STATUSES, type ApplicationStatus } from "@/lib/enums";
import { ApplicationsByJobChart } from "./charts";
import { SyncNowButton } from "./sync-now-button";

// A first-ever sync against a large, never-before-imported sheet can take
// a while (every row needs a Candidate + Application + field values +
// documents write) — matches the cron route's own cap for the same work.
export const maxDuration = 300;

// Same tones StatusBadge uses elsewhere, so a stage reads the same color
// here as it does on every application row.
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

function timeAgo(date: Date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

function Avatar({ name, tone = "orange" }: { name: string; tone?: "orange" | "red" }) {
  const tones = tone === "red" ? "bg-red-50 text-red-600" : "bg-orange-50 text-orange-600";
  return (
    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold ${tones}`}>
      {initialsOf(name) || "?"}
    </span>
  );
}

// Sub-metric tile inside the Overview card — a colored dot + uppercase
// label above a large bold number, same language as the rest of the
// StatTile family but denser, for grouping several related numbers under
// one heading instead of four separate top-level cards.
function SubTile({ label, value, color, href }: { label: string; value: string | number; color: string; href?: string }) {
  const content = (
    <div className="rounded-2xl bg-white/70 px-4 py-3.5 ring-1 ring-black/[0.04] transition-colors hover:bg-white">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        {label}
      </div>
      <p className="mt-1.5 text-[22px] font-bold tabular-nums tracking-tight text-slate-900">{value}</p>
    </div>
  );
  return href ? (
    <Link href={href} className="block">
      {content}
    </Link>
  ) : (
    content
  );
}

function Overview({
  tenantName,
  totalApplications,
  newToday,
  interviewsScheduled,
  emailsSent,
  selectedCount,
}: {
  tenantName: string;
  totalApplications: number;
  newToday: number;
  interviewsScheduled: number;
  emailsSent: number;
  selectedCount: number;
}) {
  const selectedPct = totalApplications > 0 ? (selectedCount / totalApplications) * 100 : 0;
  return (
    <Card className="overflow-hidden bg-gradient-to-br from-orange-50/70 via-white to-white ring-1 ring-orange-100">
      <div className="flex items-start justify-between gap-4 px-6 pt-6">
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-wide text-slate-400">Overview</p>
          <h2 className="mt-1 text-[20px] font-bold tracking-tight text-slate-900">{tenantName}</h2>
        </div>
        <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-[12px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
          {selectedPct.toFixed(1)}% selected
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 px-6 pb-6 pt-5 sm:grid-cols-4">
        <SubTile label="Total applications" value={totalApplications} color="#64748b" href="/applications" />
        <SubTile label="New today" value={newToday} color="#3b82f6" href="/applications?since=today" />
        <SubTile label="Interviews scheduled" value={interviewsScheduled} color="#8b5cf6" href="/applications?status=interview_scheduled" />
        <SubTile label="Emails sent" value={emailsSent} color="#10b981" href="/emails" />
      </div>
    </Card>
  );
}

function PipelineByStatus({ byStatus }: { byStatus: Record<ApplicationStatus, number> }) {
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

export default async function DashboardPage() {
  const tenant = await getCurrentTenant();
  const data = await getDashboardData(tenant.id);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-wide text-slate-400">Overview</p>
          <h1 className="mt-1 text-[34px] font-bold tracking-tight text-slate-900">Dashboard</h1>
          <p className="mt-1.5 text-[15px] text-slate-500">Every application moving through the pipeline, and what still needs a look.</p>
        </div>
        {tenant.sheetSourceUrl && <SyncNowButton />}
      </div>

      <Overview
        tenantName={tenant.name}
        totalApplications={data.stats.totalApplications}
        newToday={data.today.newApplications}
        interviewsScheduled={data.stats.byStatus.interview_scheduled}
        emailsSent={data.stats.emailsSent}
        selectedCount={data.stats.byStatus.selected}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[3fr_2fr]">
        <ApplicationsByJobChart data={data.analytics.byJob} />
        <PipelineByStatus byStatus={data.stats.byStatus} />
      </div>

      <Card>
        <CardHeader title="Attention required" description="Items that need action, most recent first." />
        {data.attentionRequired.pendingReviewApps.length === 0 && data.attentionRequired.missingDocumentsApps.length === 0 ? (
          <div className="px-6 pb-6">
            <EmptyState title="Nothing needs attention right now" />
          </div>
        ) : (
          <div className="divide-y divide-black/[0.04] px-2 pb-2">
            {data.attentionRequired.pendingReviewApps.map((app) => (
              <Link
                key={app.id}
                href={`/applications/${app.id}`}
                className="flex items-center gap-3 rounded-2xl px-4 py-3 text-[14px] transition-colors hover:bg-slate-50"
              >
                <Avatar name={app.candidate.fullName} />
                <span className="min-w-0 flex-1 text-slate-600">
                  <span className="font-semibold text-slate-900">{app.candidate.fullName}</span> awaiting review for {app.job.title}
                </span>
                <span className="shrink-0 text-[13px] text-slate-400">{timeAgo(app.createdAt)}</span>
              </Link>
            ))}
            {data.attentionRequired.missingDocumentsApps.map((app) => (
              <Link
                key={app.id}
                href={`/applications/${app.id}`}
                className="flex items-center gap-3 rounded-2xl px-4 py-3 text-[14px] transition-colors hover:bg-slate-50"
              >
                <Avatar name={app.candidate.fullName} tone="red" />
                <span className="min-w-0 flex-1 text-slate-600">
                  <span className="font-semibold text-slate-900">{app.candidate.fullName}</span> has no documents uploaded
                </span>
                <span className="shrink-0 text-[13px] text-slate-400">{timeAgo(app.createdAt)}</span>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
