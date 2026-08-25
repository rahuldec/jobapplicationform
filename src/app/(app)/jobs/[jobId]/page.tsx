import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { updateJobDeadlineAction } from "@/lib/actions/jobs";
import { Card, CardHeader, StatusBadge, EmptyState, inputClass } from "@/components/ui/primitives";
import { APPLICATION_STATUS_LABELS } from "@/lib/enums";

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      department: true,
      form: true,
      applications: {
        include: { candidate: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!job) notFound();

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold text-slate-900">{job.title}</h1>
          <StatusBadge status={job.status} label={job.status[0].toUpperCase() + job.status.slice(1)} />
        </div>
        <p className="text-sm text-slate-500">
          {job.department?.name ?? "No department"} · {job.numberOfPositions} position(s)
          {job.code ? ` · ${job.code}` : ""}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Application form</p>
          <p className="mt-1 text-sm text-slate-800">{job.form?.name ?? "Not configured"}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Candidate application link</p>
          {job.status === "published" && job.form ? (
            <code className="mt-1 block truncate text-xs text-slate-600">/apply/{job.id}</code>
          ) : (
            <p className="mt-1 text-sm text-slate-400">Publish the job with a form attached to activate</p>
          )}
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Deadline</p>
          <form action={updateJobDeadlineAction} className="mt-1 flex items-center gap-1.5">
            <input type="hidden" name="jobId" value={job.id} />
            <input
              type="date"
              name="applicationDeadline"
              defaultValue={job.applicationDeadline ? job.applicationDeadline.toISOString().slice(0, 10) : ""}
              className={`${inputClass} py-1 text-sm`}
            />
            <button type="submit" className="text-xs font-medium text-orange-600 hover:underline">
              Save
            </button>
          </form>
        </Card>
      </div>

      {job.description ? (
        <Card className="p-5">
          <p className="text-sm text-slate-600 whitespace-pre-wrap">{job.description}</p>
        </Card>
      ) : null}

      <Card className="overflow-hidden">
        <CardHeader title="Applications" description={`${job.applications.length} received`} />
        {job.applications.length === 0 ? (
          <div className="p-5">
            <EmptyState title="No applications yet" description="Applications will appear here once candidates apply." />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2.5">Application #</th>
                <th className="px-4 py-2.5">Candidate</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Applied</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {job.applications.map((app) => (
                <tr key={app.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/applications/${app.id}`} className="font-medium text-orange-600 hover:underline">
                      {app.applicationNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{app.candidate.fullName}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={app.status} label={APPLICATION_STATUS_LABELS[app.status as keyof typeof APPLICATION_STATUS_LABELS] ?? app.status} />
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {app.submittedAt
                      ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(app.submittedAt)
                      : "Draft"}
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
