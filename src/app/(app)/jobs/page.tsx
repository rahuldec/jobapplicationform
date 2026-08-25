import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentTenant } from "@/lib/tenant";
import { Card, EmptyState, StatusBadge } from "@/components/ui/primitives";
import { JOB_STATUSES } from "@/lib/enums";

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; departmentId?: string }>;
}) {
  const params = await searchParams;
  const tenant = await getCurrentTenant();

  const [jobs, departments] = await Promise.all([
    prisma.job.findMany({
      where: {
        tenantId: tenant.id,
        status: params.status && JOB_STATUSES.includes(params.status as never) ? params.status : undefined,
        departmentId: params.departmentId || undefined,
      },
      include: { department: true, _count: { select: { applications: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.department.findMany({ where: { tenantId: tenant.id }, orderBy: { name: "asc" } }),
  ]);

  const buildHref = (overrides: Record<string, string | undefined>) => {
    const next = new URLSearchParams();
    const merged = { ...params, ...overrides };
    for (const [k, v] of Object.entries(merged)) {
      if (v) next.set(k, v);
    }
    const qs = next.toString();
    return qs ? `/jobs?${qs}` : "/jobs";
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Jobs</h1>
          <p className="text-sm text-slate-500">{tenant.name}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <FilterLink href={buildHref({ status: undefined })} active={!params.status}>
          All statuses
        </FilterLink>
        {JOB_STATUSES.filter((s) => s !== "draft").map((s) => (
          <FilterLink key={s} href={buildHref({ status: s })} active={params.status === s}>
            {s[0].toUpperCase() + s.slice(1)}
          </FilterLink>
        ))}
        <span className="mx-1 h-4 w-px bg-slate-200" />
        <FilterLink href={buildHref({ departmentId: undefined })} active={!params.departmentId}>
          All departments
        </FilterLink>
        {departments.map((d) => (
          <FilterLink key={d.id} href={buildHref({ departmentId: d.id })} active={params.departmentId === d.id}>
            {d.name}
          </FilterLink>
        ))}
      </div>

      <Card className="overflow-hidden">
        {jobs.length === 0 ? (
          <EmptyState title="No jobs found" description="Create a job posting to start receiving applications." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2.5">Job</th>
                <th className="px-4 py-2.5">Department</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Applications</th>
                <th className="px-4 py-2.5">Deadline</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {jobs.map((job) => (
                <tr key={job.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/jobs/${job.id}`} className="font-medium text-orange-600 hover:underline">
                      {job.title}
                    </Link>
                    {job.code ? <p className="text-xs text-slate-400">{job.code}</p> : null}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{job.department?.name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={job.status} label={job.status[0].toUpperCase() + job.status.slice(1)} />
                  </td>
                  <td className="px-4 py-3 text-slate-600">{job._count.applications}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {job.applicationDeadline
                      ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(job.applicationDeadline)
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

function FilterLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`rounded-md px-2.5 py-1 text-xs font-medium ${
        active ? "bg-orange-100 text-orange-700" : "bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50"
      }`}
    >
      {children}
    </Link>
  );
}
