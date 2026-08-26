import Link from "next/link";
import { getCurrentTenant } from "@/lib/tenant";
import { getDashboardData } from "@/lib/queries/dashboard";
import { Card, CardHeader, EmptyState, StatTile } from "@/components/ui/primitives";
import { APPLICATION_STATUS_LABELS, VISIBLE_APPLICATION_STATUSES, type ApplicationStatus } from "@/lib/enums";
import { ApplicationsByJobChart } from "./charts";
import { IconLayers, IconClock, IconCalendar, IconPaperPlane } from "@/components/ui/icons";

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
  const tones = tone === "red" ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700";
  return <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-medium ${tones}`}>{initialsOf(name) || "?"}</span>;
}

function PipelineByStatus({ byStatus }: { byStatus: Record<ApplicationStatus, number> }) {
  const max = Math.max(1, ...VISIBLE_APPLICATION_STATUSES.map((s) => byStatus[s]));
  return (
    <Card>
      <CardHeader title="Pipeline by status" description="Click a stage to filter Applications." />
      <div className="space-y-3.5 px-5 py-4">
        {VISIBLE_APPLICATION_STATUSES.map((status) => {
          const value = byStatus[status];
          return (
            <Link key={status} href={`/applications?status=${status}`} className="block">
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-slate-500">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: PIPELINE_STATUS_COLOR[status] }} />
                  {APPLICATION_STATUS_LABELS[status]}
                </span>
                <span className="font-medium text-slate-900">{value}</span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100">
                <div
                  className="h-1.5 rounded-full transition-all"
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
    <div className="space-y-5">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Overview</p>
        <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
        <p className="mt-0.5 text-sm text-slate-500">Every application moving through the pipeline, and what still needs a look.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Total applications" value={data.stats.totalApplications} sublabel="all time" icon={IconLayers} href="/applications" />
        <StatTile
          label="New today"
          value={data.today.newApplications}
          sublabel={`${data.today.shortlisted} shortlisted · ${data.today.rejected} rejected today`}
          icon={IconClock}
          href="/applications?since=today"
        />
        <StatTile
          label="Interviews scheduled"
          value={data.stats.byStatus.interview_scheduled}
          sublabel="awaiting outcome"
          icon={IconCalendar}
          href="/applications?status=interview_scheduled"
        />
        <StatTile label="Emails sent" value={data.stats.emailsSent} sublabel="single + bulk" icon={IconPaperPlane} href="/emails" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[3fr_2fr]">
        <ApplicationsByJobChart data={data.analytics.byJob} />
        <PipelineByStatus byStatus={data.stats.byStatus} />
      </div>

      <Card>
        <CardHeader title="Attention required" description="Items that need action, most recent first." />
        {data.attentionRequired.pendingReviewApps.length === 0 && data.attentionRequired.missingDocumentsApps.length === 0 ? (
          <div className="p-5">
            <EmptyState title="Nothing needs attention right now" />
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {data.attentionRequired.pendingReviewApps.map((app) => (
              <Link key={app.id} href={`/applications/${app.id}`} className="flex items-center gap-3 px-5 py-3 text-sm hover:bg-slate-50">
                <Avatar name={app.candidate.fullName} />
                <span className="min-w-0 flex-1 text-slate-700">
                  <span className="font-medium text-slate-900">{app.candidate.fullName}</span> awaiting review for {app.job.title}
                </span>
                <span className="shrink-0 text-xs text-slate-400">{timeAgo(app.createdAt)}</span>
              </Link>
            ))}
            {data.attentionRequired.missingDocumentsApps.map((app) => (
              <Link key={app.id} href={`/applications/${app.id}`} className="flex items-center gap-3 px-5 py-3 text-sm hover:bg-slate-50">
                <Avatar name={app.candidate.fullName} tone="red" />
                <span className="min-w-0 flex-1 text-slate-700">
                  <span className="font-medium text-slate-900">{app.candidate.fullName}</span> has no documents uploaded
                </span>
                <span className="shrink-0 text-xs text-slate-400">{timeAgo(app.createdAt)}</span>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
