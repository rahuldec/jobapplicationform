import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { publishJobAction } from "@/lib/actions/jobs";
import { updateApplicationDueDateAction } from "@/lib/actions/applications";
import { Card, CardHeader, StatusBadge, Button, EmptyState, inputClass } from "@/components/ui/primitives";
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
      scoringPattern: { include: { versions: { where: { status: "published" } } } },
      applications: {
        include: { candidate: true, scores: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!job) notFound();

  const publishedVersion = job.scoringPattern?.versions[0];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
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
        <div className="flex gap-2">
          {job.status !== "published" && (
            <form action={publishJobAction}>
              <input type="hidden" name="jobId" value={job.id} />
              <Button type="submit" variant="secondary">
                Publish
              </Button>
            </form>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Application form</p>
          <p className="mt-1 text-sm text-slate-800">{job.form?.name ?? "Not configured"}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Scoring pattern</p>
          <p className="mt-1 text-sm text-slate-800">
            {job.scoringPattern ? (
              <Link href={`/scoring/${job.scoringPattern.id}`} className="text-orange-600 hover:underline">
                {job.scoringPattern.name}
              </Link>
            ) : (
              "Not configured"
            )}
          </p>
          {job.scoringPattern && !publishedVersion ? (
            <p className="mt-1 text-xs text-amber-600">No published version yet — scores can&apos;t be calculated.</p>
          ) : null}
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Candidate application link</p>
          {job.status === "published" && job.form ? (
            <code className="mt-1 block truncate text-xs text-slate-600">/apply/{job.id}</code>
          ) : (
            <p className="mt-1 text-sm text-slate-400">Publish the job with a form attached to activate</p>
          )}
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
                <th className="px-4 py-2.5">Score</th>
                <th className="px-4 py-2.5">Applied</th>
                <th className="px-4 py-2.5">Due Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {job.applications.map((app) => {
                const score = app.scores[0];
                const finalScore = score?.overrideScore ?? score?.calculatedScore;
                return (
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
                    <td className="px-4 py-3 tabular-nums text-slate-700">
                      {finalScore !== undefined ? `${finalScore} / ${score?.calculatedMaxScore ?? "?"}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {app.submittedAt
                        ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(app.submittedAt)
                        : "Draft"}
                    </td>
                    <td className="px-4 py-3">
                      <form action={updateApplicationDueDateAction} className="flex items-center gap-1.5">
                        <input type="hidden" name="applicationId" value={app.id} />
                        <input
                          type="date"
                          name="dueDate"
                          defaultValue={app.dueDate ? app.dueDate.toISOString().slice(0, 10) : ""}
                          className={`${inputClass} py-1 text-xs`}
                        />
                        <button type="submit" className="text-xs font-medium text-orange-600 hover:underline">
                          Save
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
