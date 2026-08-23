import Link from "next/link";
import { getCurrentTenant } from "@/lib/tenant";
import { getDashboardData } from "@/lib/queries/dashboard";
import { Card, CardHeader, StatTile, EmptyState } from "@/components/ui/primitives";
import { APPLICATION_STATUS_LABELS } from "@/lib/enums";

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

const ACTION_LABELS: Record<string, string> = {
  "application.submitted": "submitted an application",
  "application.reviewed": "reviewed an application",
  "application.status_changed": "changed application status",
  "document.uploaded": "uploaded a document",
  "document.verified": "verified a document",
  "score.calculated": "calculated a score",
  "score.overridden": "overrode a score",
  "scoring_pattern.created": "created a scoring pattern",
  "scoring_pattern.version_published": "published a scoring pattern version",
  "job.created": "created a job",
  "job.published": "published a job",
};

export default async function DashboardPage() {
  const tenant = await getCurrentTenant();
  const data = await getDashboardData(tenant.id);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">HR Operations Dashboard</h1>
      </div>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Applications overview
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
          <StatTile label="Total" value={data.stats.totalApplications} href="/applications" />
          <StatTile
            label="Pending"
            value={data.stats.pendingReview}
            tone="warning"
            href="/applications?status=submitted,under_review"
          />
          <StatTile label="Shortlisted" value={data.stats.shortlisted} href="/applications?status=shortlisted" />
          <StatTile
            label="Interviews"
            value={data.stats.interviews}
            href="/applications?status=interview_scheduled,interviewed"
          />
          <StatTile label="Selected" value={data.stats.selected} tone="success" href="/applications?status=selected" />
          <StatTile label="Rejected" value={data.stats.rejected} tone="danger" href="/applications?status=rejected" />
          <StatTile label="Docs Pending" value={data.stats.documentsPending} tone="warning" />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Today&apos;s operations
        </h2>
        <div className="grid grid-cols-3 gap-3">
          <StatTile label="New applications today" value={data.today.newApplications} href="/applications?since=today" />
          <StatTile
            label="Shortlisted today"
            value={data.today.shortlisted}
            href="/applications?status=shortlisted&since=today"
          />
          <StatTile
            label="Rejected today"
            value={data.today.rejected}
            href="/applications?status=rejected&since=today"
          />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Attention required"
            description="Items that need action, most recent first"
          />
          <div className="divide-y divide-slate-100">
            {data.attentionRequired.pendingReviewApps.length === 0 &&
            data.attentionRequired.missingDocumentsApps.length === 0 ? (
              <div className="p-5">
                <EmptyState title="Nothing needs attention right now" />
              </div>
            ) : (
              <>
                {data.attentionRequired.pendingReviewApps.map((app) => (
                  <Link
                    key={app.id}
                    href={`/applications/${app.id}`}
                    className="flex items-center justify-between px-5 py-3 text-sm hover:bg-slate-50"
                  >
                    <span className="text-slate-700">
                      <span className="font-medium text-slate-900">{app.candidate.fullName}</span>{" "}
                      awaiting review for {app.job.title}
                    </span>
                    <span className="text-xs text-slate-400">{timeAgo(app.createdAt)}</span>
                  </Link>
                ))}
                {data.attentionRequired.missingDocumentsApps.map((app) => (
                  <Link
                    key={app.id}
                    href={`/applications/${app.id}`}
                    className="flex items-center justify-between px-5 py-3 text-sm hover:bg-slate-50"
                  >
                    <span className="text-slate-700">
                      <span className="font-medium text-slate-900">{app.candidate.fullName}</span>{" "}
                      has no documents uploaded
                    </span>
                    <span className="text-xs text-slate-400">{timeAgo(app.createdAt)}</span>
                  </Link>
                ))}
              </>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Activity timeline" description="Latest actions across the tenant" />
          <div className="divide-y divide-slate-100">
            {data.recentActivity.length === 0 ? (
              <div className="p-5">
                <EmptyState title="No activity yet" />
              </div>
            ) : (
              data.recentActivity.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between px-5 py-3 text-sm">
                  <span className="text-slate-700">
                    <span className="font-medium text-slate-900">{entry.actorName}</span>{" "}
                    {ACTION_LABELS[entry.action] ?? entry.action}
                  </span>
                  <span className="text-xs text-slate-400">{timeAgo(entry.createdAt)}</span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <p className="text-xs text-slate-400">
        Status reference:{" "}
        {Object.values(APPLICATION_STATUS_LABELS).join(" · ")}
      </p>
    </div>
  );
}
