import Link from "next/link";
import { getCurrentTenant } from "@/lib/tenant";
import { getDashboardData } from "@/lib/queries/dashboard";
import { Card, CardHeader, EmptyState, OverviewCard, OverviewSubTile } from "@/components/ui/primitives";
import type { ApplicationStatus } from "@/lib/enums";
import { DynamicFieldCharts } from "./charts";
import { HeroSearch } from "./hero-search";
import { parseSheetImportConfig, type ChartMapping } from "../../../../prisma/sheet-import/types";

// A first-ever sync against a large, never-before-imported sheet can take
// a while (every row needs a Candidate + Application + field values +
// documents write) — matches the cron route's own cap for the same work.
export const maxDuration = 300;

// Same tones StatusBadge uses elsewhere, so a stage reads the same color
// here as it does on every application row.
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

export default async function DashboardPage() {
  const tenant = await getCurrentTenant();
  const data = await getDashboardData(tenant.id);

  // Default: show "Applications by job" bar chart until the admin configures something.
  // Once chartMappings is explicitly set (even to []), use exactly what's configured.
  const DEFAULT_CHART_MAPPINGS: ChartMapping[] = [
    { fieldKey: "__job__", label: "Applications by job", chartType: "bar" },
  ];
  let chartMappings: ChartMapping[] = DEFAULT_CHART_MAPPINGS;
  if (tenant.sheetMappingJson) {
    try {
      const cfg = parseSheetImportConfig(tenant.sheetMappingJson);
      if (cfg.chartMappings !== undefined) chartMappings = cfg.chartMappings;
    } catch {
      // Malformed config — fall back to default
    }
  }

  return (
    <div className="space-y-8">
      <HeroSearch tenantName={tenant.name} />

      <OverviewCard
        title={tenant.name}
        badgeLabel={`${(data.stats.totalApplications > 0 ? (data.stats.byStatus.selected / data.stats.totalApplications) * 100 : 0).toFixed(1)}% selected`}
      >
        <OverviewSubTile label="Total applications" value={data.stats.totalApplications} color="#64748b" href="/applications" />
        <OverviewSubTile label="New today" value={data.today.newApplications} color="#3b82f6" href="/applications?since=today" />
        <OverviewSubTile
          label="Interviews scheduled"
          value={data.stats.byStatus.interview_scheduled}
          color="#8b5cf6"
          href="/applications?status=interview_scheduled"
        />
        <OverviewSubTile label="Emails sent" value={data.stats.emailsSent} color="#10b981" href="/emails" />
      </OverviewCard>

      <DynamicFieldCharts mappings={chartMappings} pipelineData={data.stats.byStatus} />

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
