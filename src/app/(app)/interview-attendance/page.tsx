import { prisma } from "@/lib/prisma";
import { getCurrentTenant } from "@/lib/tenant";
import { Card, EmptyState } from "@/components/ui/primitives";
import { INTERVIEW_MODE_LABELS } from "@/lib/enums";
import { dayRangeIST, formatDate, todayIST } from "@/lib/date";
import { AttendanceControls } from "./attendance-controls";

const TIME_ZONE = "Asia/Kolkata";
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export default async function InterviewAttendancePage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const { date: dateParam } = await searchParams;
  const tenant = await getCurrentTenant();
  const date = dateParam && DATE_PATTERN.test(dateParam) ? dateParam : todayIST();
  const { start, end } = dayRangeIST(date);

  // Cancelled interviews don't need anyone to show up or sign, so they're
  // left off the sheet — completed/no_show ones still show (this report
  // is scoped to "who was scheduled that day", not just upcoming ones).
  const interviews = await prisma.interview.findMany({
    where: { tenantId: tenant.id, scheduledAt: { gte: start, lt: end }, status: { not: "cancelled" } },
    include: { application: { include: { candidate: true, job: true } } },
    orderBy: { scheduledAt: "asc" },
  });

  const timeFormatter = new Intl.DateTimeFormat("en-IN", { timeStyle: "short", timeZone: TIME_ZONE });

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Interview Attendance</h1>
          <p className="text-sm text-slate-500">
            {interviews.length} interview{interviews.length === 1 ? "" : "s"} scheduled on {formatDate(start)} · {tenant.name}
          </p>
        </div>
      </div>

      <Card className="p-4 print:hidden">
        <AttendanceControls date={date} hasRows={interviews.length > 0} />
      </Card>

      <Card className="overflow-hidden print:shadow-none print:ring-0">
        <div className="hidden px-6 pb-4 pt-6 text-center print:block">
          <h2 className="text-lg font-semibold text-slate-900">{tenant.name}</h2>
          <p className="text-sm text-slate-600">Interview Attendance Sheet — {formatDate(start)}</p>
        </div>
        {interviews.length === 0 ? (
          <EmptyState title="No interviews scheduled" description={`Nothing scheduled for ${formatDate(start)}.`} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500 print:bg-white">
                  <th className="px-4 py-2.5">#</th>
                  <th className="px-4 py-2.5">Candidate</th>
                  <th className="px-4 py-2.5">Job</th>
                  <th className="px-4 py-2.5">Time</th>
                  <th className="px-4 py-2.5">Mode</th>
                  <th className="px-4 py-2.5">Location / Panel</th>
                  <th className="w-44 px-4 py-2.5">Signature</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {interviews.map((iv, i) => (
                  <tr key={iv.id}>
                    <td className="px-4 py-3 text-slate-500">{i + 1}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{iv.application.candidate.fullName}</td>
                    <td className="px-4 py-3 text-slate-600">{iv.application.job.title}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-600">{timeFormatter.format(iv.scheduledAt)}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {INTERVIEW_MODE_LABELS[iv.mode as keyof typeof INTERVIEW_MODE_LABELS] ?? iv.mode}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{iv.location || iv.panelistNames || "—"}</td>
                    <td className="border-l border-slate-200 px-4 py-3" />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
