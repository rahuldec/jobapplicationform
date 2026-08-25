import Link from "next/link";
import { getCurrentTenant } from "@/lib/tenant";
import { getDashboardData } from "@/lib/queries/dashboard";
import { Card, CardHeader, StatTile, EmptyState } from "@/components/ui/primitives";
import { APPLICATION_STATUS_LABELS, VISIBLE_APPLICATION_STATUSES, type ApplicationStatus } from "@/lib/enums";
import {
  IconLayers,
  IconPaperPlane,
  IconSearch,
  IconStar,
  IconCalendar,
  IconUsers,
  IconCheckCircle,
  IconXCircle,
  IconArchive,
  IconClock,
} from "@/components/ui/icons";

const STATUS_TONE: Record<ApplicationStatus, "default" | "warning" | "success" | "danger"> = {
  draft: "default",
  submitted: "warning",
  under_review: "warning",
  shortlisted: "default",
  interview_scheduled: "default",
  interviewed: "default",
  selected: "success",
  rejected: "danger",
  withdrawn: "default",
};

const STATUS_ICON: Record<ApplicationStatus, typeof IconStar> = {
  draft: IconArchive,
  submitted: IconPaperPlane,
  under_review: IconSearch,
  shortlisted: IconStar,
  interview_scheduled: IconCalendar,
  interviewed: IconUsers,
  selected: IconCheckCircle,
  rejected: IconXCircle,
  withdrawn: IconArchive,
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

function Avatar({ name }: { name: string }) {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-semibold text-orange-700">
      {initialsOf(name) || "?"}
    </span>
  );
}

export default async function DashboardPage() {
  const tenant = await getCurrentTenant();
  const data = await getDashboardData(tenant.id);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">HR Operations Dashboard</h1>
        <p className="mt-0.5 text-sm text-slate-500">A live view of every application moving through your pipeline.</p>
      </div>

      <section>
        <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Applications overview</h2>
        <p className="mb-3 text-xs text-slate-400">
          Same stages as the Applications page&apos;s status filter — click any tile to see that list.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatTile label="Total" value={data.stats.totalApplications} href="/applications" tone="brand" icon={IconLayers} />
          {VISIBLE_APPLICATION_STATUSES.map((status) => (
            <StatTile
              key={status}
              label={APPLICATION_STATUS_LABELS[status]}
              value={data.stats.byStatus[status]}
              tone={STATUS_TONE[status]}
              href={`/applications?status=${status}`}
              icon={STATUS_ICON[status]}
            />
          ))}
        </div>
      </section>

      <section className="rounded-xl bg-orange-50/60 p-4 ring-1 ring-orange-100">
        <div className="mb-3 flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-500" />
          </span>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-orange-700">Today&apos;s operations</h2>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <StatTile
            label="New applications today"
            value={data.today.newApplications}
            href="/applications?since=today"
            icon={IconClock}
          />
          <StatTile
            label="Shortlisted today"
            value={data.today.shortlisted}
            href="/applications?status=shortlisted&since=today"
            icon={IconStar}
          />
          <StatTile
            label="Rejected today"
            value={data.today.rejected}
            tone="danger"
            href="/applications?status=rejected&since=today"
            icon={IconXCircle}
          />
        </div>
      </section>

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
                  className="flex items-center gap-3 px-5 py-3 text-sm hover:bg-slate-50"
                >
                  <Avatar name={app.candidate.fullName} />
                  <span className="min-w-0 flex-1 text-slate-700">
                    <span className="font-medium text-slate-900">{app.candidate.fullName}</span>{" "}
                    awaiting review for {app.job.title}
                  </span>
                  <span className="shrink-0 text-xs text-slate-400">{timeAgo(app.createdAt)}</span>
                </Link>
              ))}
              {data.attentionRequired.missingDocumentsApps.map((app) => (
                <Link
                  key={app.id}
                  href={`/applications/${app.id}`}
                  className="flex items-center gap-3 px-5 py-3 text-sm hover:bg-slate-50"
                >
                  <Avatar name={app.candidate.fullName} />
                  <span className="min-w-0 flex-1 text-slate-700">
                    <span className="font-medium text-slate-900">{app.candidate.fullName}</span>{" "}
                    has no documents uploaded
                  </span>
                  <span className="shrink-0 text-xs text-slate-400">{timeAgo(app.createdAt)}</span>
                </Link>
              ))}
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
