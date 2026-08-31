import Link from "next/link";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { getCurrentTenant } from "@/lib/tenant";
import { Card, EmptyState } from "@/components/ui/primitives";
import { APPLICATION_STATUSES } from "@/lib/enums";
import { DEFAULT_INTERVIEW_EMAIL_SUBJECT, DEFAULT_INTERVIEW_EMAIL_BODY } from "@/lib/email";
import { formatDate, startOfTodayIST } from "@/lib/date";
import { ApplicationsTable, type ApplicationRow } from "./applications-table";
import { ApplicationsFilters } from "./applications-filters";
import { ExportColumnsPicker } from "./export-columns-picker";

const CORE_EXPORT_COLUMNS = [
  "Application #",
  "Candidate Name",
  "Email",
  "Mobile",
  "Date of Birth",
  "Gender",
  "Job",
  "Department",
  "Status",
  "Applied Date",
];

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

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
    ...(isToday ? (hasStatus ? { updatedAt: { gte: startOfTodayIST() } } : { createdAt: { gte: startOfTodayIST() } }) : {}),
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

  const [applications, total, jobs, documentTypeRows, recruiters, applicationForm] = await Promise.all([
    prisma.application.findMany({
      where,
      include: { candidate: true, job: true, assignedRecruiter: true },
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
    prisma.user.findMany({ where: { tenantId: tenant.id, role: "recruiter" }, orderBy: { name: "asc" } }),
    prisma.applicationForm.findFirst({
      where: { tenantId: tenant.id },
      include: { sections: { include: { fields: true }, orderBy: { order: "asc" } } },
    }),
  ]);
  const documentTypes = documentTypeRows.map((d) => d.documentType);

  // Every column the export can possibly produce — core fields, every
  // dynamic form field the tenant has ever configured, and every document
  // type ever uploaded — independent of the current filter, so the
  // column-picker's list doesn't shift depending on which page you're on.
  // Deduplicated by label: a tenant's form can have two different fields
  // (in different sections, e.g. repeated-question blocks) that share the
  // exact same display label — the export route already collapses those
  // into a single output column keyed by that label, so the picker should
  // only ever show one checkbox for it too, not two that silently fight
  // over the same "select all" state.
  const fieldExportColumns = (applicationForm?.sections ?? []).flatMap((s) => s.fields.map((f) => f.label));
  const exportColumns = [...new Set([...CORE_EXPORT_COLUMNS, ...fieldExportColumns, ...documentTypes.map((t) => `Document: ${t}`)])];

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
    assignedRecruiterId: app.assignedRecruiterId,
    assignedRecruiterName: app.assignedRecruiter?.name ?? null,
    appliedLabel: app.submittedAt ? formatDate(app.submittedAt) : "Draft",
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
            <ExportColumnsPicker baseHref={exportHref} columns={exportColumns} />
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
            <ApplicationsTable
              rows={rows}
              recruiters={recruiters.map((r) => ({ id: r.id, name: r.name }))}
              defaultEmailSubject={tenant.interviewEmailSubject || DEFAULT_INTERVIEW_EMAIL_SUBJECT}
              defaultEmailBody={tenant.interviewEmailBody || DEFAULT_INTERVIEW_EMAIL_BODY}
              defaultEmailCc={tenant.interviewEmailCc ?? ""}
              defaultEmailBcc={tenant.interviewEmailBcc ?? ""}
            />
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
