import Link from "next/link";
import { getCurrentTenant } from "@/lib/tenant";
import { getDashboardData } from "@/lib/queries/dashboard";
import { EmptyState } from "@/components/ui/primitives";
import { APPLICATION_STATUS_LABELS, VISIBLE_APPLICATION_STATUSES, type ApplicationStatus } from "@/lib/enums";
import {
  IconLayers,
  IconSearch,
  IconStar,
  IconCalendar,
  IconUsers,
  IconCheckCircle,
  IconXCircle,
  IconArchive,
  IconClock,
} from "@/components/ui/icons";

type IconType = typeof IconStar;

const STATUS_NUMBER_CLASS: Record<ApplicationStatus, string> = {
  draft: "text-slate-900",
  submitted: "text-amber-600",
  under_review: "text-amber-600",
  shortlisted: "text-slate-900",
  interview_scheduled: "text-slate-900",
  interviewed: "text-slate-900",
  selected: "text-emerald-600",
  rejected: "text-red-600",
  withdrawn: "text-slate-900",
};

const STATUS_ICON: Record<ApplicationStatus, IconType> = {
  draft: IconArchive,
  submitted: IconClock,
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

// Frosted-glass "bento" tile: translucent white over the page's subtle
// aurora glow, with a soft shadow for lift.
function GlassTile({
  href,
  label,
  value,
  icon: Icon,
  valueClassName = "text-slate-900",
  hero = false,
}: {
  href: string;
  label: string;
  value: number;
  icon: IconType;
  valueClassName?: string;
  hero?: boolean;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-2 rounded-2xl border border-white/70 bg-white/55 p-3 shadow-lg shadow-slate-900/10 backdrop-blur-lg transition-colors hover:bg-white/75"
    >
      <div className="flex items-start justify-between">
        <span className="text-[11px] font-bold text-slate-500">{label}</span>
        <Icon className="h-4 w-4 text-slate-400" />
      </div>
      <p className={`font-bold tabular-nums leading-none ${hero ? "text-3xl" : "text-xl"} ${valueClassName}`}>{value}</p>
    </Link>
  );
}

function Avatar({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-500/10 text-[11px] font-medium text-orange-700 ${className}`}
    >
      {initialsOf(name) || "?"}
    </span>
  );
}

export default async function DashboardPage() {
  const tenant = await getCurrentTenant();
  const data = await getDashboardData(tenant.id);

  return (
    <div className="relative overflow-hidden rounded-3xl bg-neutral-50 p-5 sm:p-7">
      <div className="pointer-events-none absolute -left-16 -top-20 h-64 w-64 rounded-full bg-indigo-500/[0.14] blur-3xl" />
      <div className="pointer-events-none absolute -right-16 -bottom-24 h-72 w-72 rounded-full bg-teal-500/[0.13] blur-3xl" />

      <div className="relative space-y-6">
        <div>
          <h1 className="text-xl font-medium text-slate-900">HR Operations Dashboard</h1>
          <p className="mt-0.5 text-sm text-slate-500">A live view of every application moving through your pipeline.</p>
        </div>

        <section>
          <p className="mb-3 text-xs text-slate-400">
            Same stages as the Applications page&apos;s status filter — click any tile to see that list.
          </p>
          <div className="grid grid-cols-2 items-start gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <GlassTile href="/applications" label="Total" value={data.stats.totalApplications} icon={IconLayers} hero />
            {VISIBLE_APPLICATION_STATUSES.map((status) => (
              <GlassTile
                key={status}
                href={`/applications?status=${status}`}
                label={APPLICATION_STATUS_LABELS[status]}
                value={data.stats.byStatus[status]}
                icon={STATUS_ICON[status]}
                valueClassName={STATUS_NUMBER_CLASS[status]}
              />
            ))}
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-500" />
            </span>
            <h2 className="text-xs font-medium uppercase tracking-wide text-slate-500">Today&apos;s operations</h2>
          </div>
          <div className="grid grid-cols-3 items-start gap-3">
            <GlassTile href="/applications?since=today" label="New applications today" value={data.today.newApplications} icon={IconClock} />
            <GlassTile
              href="/applications?status=shortlisted&since=today"
              label="Shortlisted today"
              value={data.today.shortlisted}
              icon={IconStar}
            />
            <GlassTile
              href="/applications?status=rejected&since=today"
              label="Rejected today"
              value={data.today.rejected}
              icon={IconXCircle}
              valueClassName="text-red-600"
            />
          </div>
        </section>

        <div className="rounded-2xl border border-white/70 bg-white/55 shadow-lg shadow-slate-900/10 backdrop-blur-lg">
          <div className="border-b border-slate-900/5 px-5 py-4">
            <h2 className="text-sm font-medium text-slate-900">Attention required</h2>
            <p className="mt-0.5 text-sm text-slate-500">Items that need action, most recent first</p>
          </div>
          <div className="divide-y divide-slate-900/5">
            {data.attentionRequired.pendingReviewApps.length === 0 && data.attentionRequired.missingDocumentsApps.length === 0 ? (
              <div className="p-5">
                <EmptyState title="Nothing needs attention right now" />
              </div>
            ) : (
              <>
                {data.attentionRequired.pendingReviewApps.map((app) => (
                  <Link key={app.id} href={`/applications/${app.id}`} className="flex items-center gap-3 px-5 py-3 text-sm hover:bg-white/60">
                    <Avatar name={app.candidate.fullName} />
                    <span className="min-w-0 flex-1 text-slate-700">
                      <span className="font-medium text-slate-900">{app.candidate.fullName}</span> awaiting review for {app.job.title}
                    </span>
                    <span className="shrink-0 text-xs text-slate-400">{timeAgo(app.createdAt)}</span>
                  </Link>
                ))}
                {data.attentionRequired.missingDocumentsApps.map((app) => (
                  <Link key={app.id} href={`/applications/${app.id}`} className="flex items-center gap-3 px-5 py-3 text-sm hover:bg-white/60">
                    <Avatar name={app.candidate.fullName} className="bg-red-500/10 text-red-700" />
                    <span className="min-w-0 flex-1 text-slate-700">
                      <span className="font-medium text-slate-900">{app.candidate.fullName}</span> has no documents uploaded
                    </span>
                    <span className="shrink-0 text-xs text-slate-400">{timeAgo(app.createdAt)}</span>
                  </Link>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
