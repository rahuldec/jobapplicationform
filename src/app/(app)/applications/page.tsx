import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentTenant } from "@/lib/tenant";
import { Card, EmptyState, inputClass, Button } from "@/components/ui/primitives";
import { APPLICATION_STATUS_LABELS, APPLICATION_STATUSES, VISIBLE_APPLICATION_STATUSES } from "@/lib/enums";
import { ApplicationsTable, type ApplicationRow } from "./applications-table";

const PAGE_SIZE = 20;

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; jobId?: string; page?: string; since?: string }>;
}) {
  const params = await searchParams;
  const tenant = await getCurrentTenant();
  const page = Math.max(1, Number(params.page ?? 1) || 1);

  const isToday = params.since === "today";
  // Supports comma-separated statuses (e.g. "submitted,under_review") so
  // dashboard tiles that count more than one status can link to an exact
  // matching view here.
  const statusList = (params.status ?? "")
    .split(",")
    .filter((s): s is (typeof APPLICATION_STATUSES)[number] => APPLICATION_STATUSES.includes(s as never));
  const hasStatus = statusList.length > 0;

  const where = {
    tenantId: tenant.id,
    status: hasStatus ? { in: statusList } : undefined,
    jobId: params.jobId || undefined,
    // Dashboard "today" tiles link here: with a status filter, "today" means
    // that status was last set today; without one, it means the application
    // itself was created today (matches how the dashboard counts each stat).
    ...(isToday ? (hasStatus ? { updatedAt: { gte: startOfToday() } } : { createdAt: { gte: startOfToday() } }) : {}),
    ...(params.q
      ? {
          OR: [
            { applicationNumber: { contains: params.q } },
            { candidate: { fullName: { contains: params.q } } },
            { candidate: { email: { contains: params.q } } },
            { candidate: { mobile: { contains: params.q } } },
          ],
        }
      : {}),
  };

  const [applications, total, jobs] = await Promise.all([
    prisma.application.findMany({
      where,
      include: { candidate: true, job: true, scores: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.application.count({ where }),
    prisma.job.findMany({ where: { tenantId: tenant.id }, orderBy: { title: "asc" } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const buildHref = (overrides: Record<string, string | undefined>, base = "/applications") => {
    const next = new URLSearchParams();
    const merged = { ...params, ...overrides };
    for (const [k, v] of Object.entries(merged)) {
      if (v) next.set(k, v);
    }
    const qs = next.toString();
    return qs ? `${base}?${qs}` : base;
  };
  const exportHref = buildHref({ page: undefined }, "/api/export/applications");

  const rows: ApplicationRow[] = applications.map((app) => {
    const score = app.scores[0];
    const finalScore = score?.overrideScore ?? score?.calculatedScore;
    return {
      id: app.id,
      applicationNumber: app.applicationNumber,
      candidateName: app.candidate.fullName,
      candidateEmail: app.candidate.email,
      jobTitle: app.job.title,
      status: app.status,
      scoreLabel: finalScore !== undefined ? `${finalScore} / ${score?.calculatedMaxScore ?? "?"}` : "—",
      appliedLabel: app.submittedAt ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(app.submittedAt) : "Draft",
    };
  });

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Applications</h1>
          <p className="text-sm text-slate-500">
            {total} {isToday ? "matching" : "total"} · {tenant.name}
            {isToday && (
              <>
                {" · "}
                <span className="font-medium text-orange-600">filtered to today</span>
                {" · "}
                <Link href={buildHref({ since: undefined })} className="text-orange-600 hover:underline">
                  show all
                </Link>
              </>
            )}
          </p>
        </div>
        {total > 0 && (
          <div className="flex flex-wrap justify-end gap-2">
            <a href={exportHref}>
              <Button variant="secondary">Export to Excel</Button>
            </a>
          </div>
        )}
      </div>

      <Card className="p-4">
        <form className="flex flex-wrap items-end gap-3" action="/applications">
          <div className="min-w-[220px] flex-1">
            <label className="block text-xs font-medium text-slate-600">Search</label>
            <input
              name="q"
              defaultValue={params.q}
              placeholder="Name, application #, email, mobile"
              className={`${inputClass} mt-1`}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">Status</label>
            <select name="status" defaultValue={params.status ?? ""} className={`${inputClass} mt-1`}>
              <option value="">All</option>
              {VISIBLE_APPLICATION_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {APPLICATION_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">Job</label>
            <select name="jobId" defaultValue={params.jobId ?? ""} className={`${inputClass} mt-1`}>
              <option value="">All jobs</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" variant="secondary">
            Apply Filters
          </Button>
          {(params.q || params.status || params.jobId || params.since) && (
            <Link href="/applications" className="text-xs text-slate-500 hover:underline">
              Clear
            </Link>
          )}
        </form>
      </Card>

      <Card className="overflow-hidden">
        {applications.length === 0 ? (
          <EmptyState title="No applications found" description="Try adjusting your filters." />
        ) : (
          <>
            <ApplicationsTable rows={rows} />
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
                <span>
                  Page {page} of {totalPages}
                </span>
                <div className="flex gap-2">
                  {page > 1 && (
                    <Link href={buildHref({ page: String(page - 1) })} className="text-orange-600 hover:underline">
                      Previous
                    </Link>
                  )}
                  {page < totalPages && (
                    <Link href={buildHref({ page: String(page + 1) })} className="text-orange-600 hover:underline">
                      Next
                    </Link>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
