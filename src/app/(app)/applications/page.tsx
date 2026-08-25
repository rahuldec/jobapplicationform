import Link from "next/link";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { getCurrentTenant } from "@/lib/tenant";
import { Card, EmptyState, Button } from "@/components/ui/primitives";
import { APPLICATION_STATUSES } from "@/lib/enums";
import { ApplicationsTable, type ApplicationRow } from "./applications-table";
import { ApplicationsFilters } from "./applications-filters";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; jobId?: string; page?: string; pageSize?: string; since?: string }>;
}) {
  const params = await searchParams;
  const tenant = await getCurrentTenant();
  const page = Math.max(1, Number(params.page ?? 1) || 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(params.pageSize) || DEFAULT_PAGE_SIZE));

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

  const [applications, total, jobs, documentTypeRows] = await Promise.all([
    prisma.application.findMany({
      where,
      include: { candidate: true, job: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.application.count({ where }),
    prisma.job.findMany({ where: { tenantId: tenant.id }, orderBy: { title: "asc" } }),
    prisma.document.findMany({
      where: { tenantId: tenant.id },
      select: { documentType: true },
      distinct: ["documentType"],
      orderBy: { documentType: "asc" },
    }),
  ]);
  const documentTypes = documentTypeRows.map((d) => d.documentType);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const buildHref = (overrides: Record<string, string | undefined>, base = "/applications") => {
    const next = new URLSearchParams();
    const merged = { ...params, ...overrides };
    for (const [k, v] of Object.entries(merged)) {
      if (v) next.set(k, v);
    }
    const qs = next.toString();
    return qs ? `${base}?${qs}` : base;
  };
  const exportHref = buildHref({ page: undefined, documentType: undefined }, "/api/export/applications");

  const rows: ApplicationRow[] = applications.map((app, i) => ({
    id: app.id,
    serial: (page - 1) * pageSize + i + 1,
    applicationNumber: app.applicationNumber,
    candidateName: app.candidate.fullName,
    candidateEmail: app.candidate.email,
    jobTitle: app.job.title,
    status: app.status,
    appliedLabel: app.submittedAt ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(app.submittedAt) : "Draft",
  }));

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
        <Suspense fallback={null}>
          <ApplicationsFilters jobs={jobs} documentTypes={documentTypes} />
        </Suspense>
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
