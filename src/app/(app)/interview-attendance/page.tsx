import { prisma } from "@/lib/prisma";
import { getCurrentTenant } from "@/lib/tenant";
import { getTenantBranding } from "@/lib/branding";
import { Card, EmptyState } from "@/components/ui/primitives";
import { INTERVIEW_MODE_LABELS } from "@/lib/enums";
import { dayRangeIST, formatDate, formatDateTime, todayIST } from "@/lib/date";
import { AttendanceControls } from "./attendance-controls";

const TIME_ZONE = "Asia/Kolkata";
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export default async function InterviewAttendancePage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const { date: dateParam } = await searchParams;
  const tenant = await getCurrentTenant();
  const branding = getTenantBranding(tenant);
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

      <Card className="overflow-hidden print:rounded-none print:bg-white print:shadow-none print:ring-0 print:backdrop-blur-none">
        {/* Letterhead — screen-hidden, print-only. Real borders (not the
            soft on-screen ones) since this is meant to be handled as a
            paper form, possibly photocopied, not just glanced at on a
            screen. */}
        <div className="hidden border-b-2 border-slate-900 px-2 pb-4 pt-2 print:block">
          <div className="flex items-center justify-center gap-4">
            {branding.logoDataUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={branding.logoDataUrl} alt="" className="h-16 w-16 shrink-0 object-contain" />
            )}
            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-900">{tenant.name}</h2>
              <p className="mt-1 text-sm font-semibold uppercase tracking-wide text-slate-700">Interview Attendance Sheet</p>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-sm text-slate-700">
            <span>
              Date: <strong>{formatDate(start)}</strong>
            </span>
            <span>
              Total Candidates: <strong>{interviews.length}</strong>
            </span>
          </div>
        </div>

        {interviews.length === 0 ? (
          <EmptyState title="No interviews scheduled" description={`Nothing scheduled for ${formatDate(start)}.`} />
        ) : (
          <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full border-collapse text-sm print:text-[13px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500 print:border-2 print:border-slate-900 print:bg-white print:text-slate-900">
                  <th className="px-4 py-2.5 print:border print:border-slate-900 print:px-3 print:py-2">#</th>
                  <th className="px-4 py-2.5 print:border print:border-slate-900 print:px-3 print:py-2">Candidate</th>
                  <th className="px-4 py-2.5 print:border print:border-slate-900 print:px-3 print:py-2">Job</th>
                  <th className="px-4 py-2.5 print:border print:border-slate-900 print:px-3 print:py-2">Time</th>
                  <th className="px-4 py-2.5 print:border print:border-slate-900 print:px-3 print:py-2">Mode</th>
                  <th className="px-4 py-2.5 print:border print:border-slate-900 print:px-3 print:py-2">Location / Panel</th>
                  <th className="w-56 px-4 py-2.5 print:w-64 print:border print:border-slate-900 print:px-3 print:py-2">
                    Signature
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 print:divide-y-0">
                {interviews.map((iv, i) => (
                  <tr key={iv.id} className="print:break-inside-avoid">
                    <td className="px-4 py-3 text-slate-500 print:border print:border-slate-900 print:px-3 print:py-4 print:text-slate-900">
                      {i + 1}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900 print:border print:border-slate-900 print:px-3 print:py-4">
                      {iv.application.candidate.fullName}
                    </td>
                    <td className="px-4 py-3 text-slate-600 print:border print:border-slate-900 print:px-3 print:py-4 print:text-slate-900">
                      {iv.application.job.title}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-600 print:border print:border-slate-900 print:px-3 print:py-4 print:text-slate-900">
                      {timeFormatter.format(iv.scheduledAt)}
                    </td>
                    <td className="px-4 py-3 text-slate-600 print:border print:border-slate-900 print:px-3 print:py-4 print:text-slate-900">
                      {INTERVIEW_MODE_LABELS[iv.mode as keyof typeof INTERVIEW_MODE_LABELS] ?? iv.mode}
                    </td>
                    <td className="px-4 py-3 text-slate-600 print:border print:border-slate-900 print:px-3 print:py-4 print:text-slate-900">
                      {iv.location || iv.panelistNames || "—"}
                    </td>
                    <td className="border-l border-slate-200 px-4 py-3 print:border print:border-slate-900 print:px-3 print:py-4" />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {interviews.length > 0 && (
          <p className="hidden px-2 pb-2 pt-6 text-right text-xs text-slate-500 print:block">
            Generated on {formatDateTime(new Date())}
          </p>
        )}
      </Card>
    </div>
  );
}
