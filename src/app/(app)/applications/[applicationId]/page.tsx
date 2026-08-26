import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  changeApplicationStatus,
  sendCandidateEmail,
  verifyDocumentAction,
  unverifyDocumentAction,
} from "@/lib/actions/applications";
import { scheduleInterview, markInterviewCompleted, cancelInterview } from "@/lib/actions/interviews";
import { Card, CardHeader, StatusBadge, Badge, Button, EmptyState, inputClass, Field, StatTile, PlaceholderChips } from "@/components/ui/primitives";
import { APPLICATION_STATUS_LABELS, SETTABLE_APPLICATION_STATUSES, INTERVIEW_MODES, INTERVIEW_MODE_LABELS, INTERVIEW_STATUS_LABELS } from "@/lib/enums";
import { DEFAULT_INTERVIEW_EMAIL_SUBJECT, DEFAULT_INTERVIEW_EMAIL_BODY, INTERVIEW_EMAIL_PLACEHOLDERS } from "@/lib/email";
import { IconCalendar, IconCheckCircle } from "@/components/ui/icons";
import { DocumentThumbnail } from "@/components/documents/document-thumbnail";

const ACTION_LABELS: Record<string, string> = {
  "application.submitted": "submitted the application",
  "application.reviewed": "reviewed the application",
  "application.status_changed": "changed the application status",
  "document.uploaded": "uploaded a document",
  "document.verified": "verified a document",
  "document.unverified": "un-verified a document",
  "interview.scheduled": "scheduled an interview",
  "interview.rescheduled": "rescheduled the interview",
  "interview.completed": "marked the interview completed",
  "interview.cancelled": "cancelled the interview",
  "email.sent": "sent an email to the candidate",
};

const TABS = [
  { key: "profile", label: "Profile" },
  { key: "application", label: "Application" },
  { key: "documents", label: "Documents" },
  { key: "interview", label: "Interview" },
  { key: "email", label: "Email" },
  { key: "activity", label: "Activity" },
] as const;

// <input type="datetime-local"> needs "YYYY-MM-DDTHH:mm" in local time,
// not an ISO string (which is UTC) — building it from the Date's own
// local getters avoids the timezone shift toISOString() would introduce.
function toDatetimeLocalValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function ApplicationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ applicationId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { applicationId } = await params;
  const { tab: rawTab } = await searchParams;
  const tab = TABS.find((t) => t.key === rawTab)?.key ?? "profile";

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      candidate: true,
      tenant: true,
      job: {
        include: {
          department: true,
          form: { include: { sections: { include: { fields: true }, orderBy: { order: "asc" } } } },
        },
      },
      fieldValues: { include: { field: true } },
      documents: { orderBy: { uploadedAt: "desc" } },
      interviews: { orderBy: { scheduledAt: "desc" } },
    },
  });

  if (!application) notFound();

  const currentInterview = application.interviews.find((i) => i.status === "scheduled") ?? null;
  const pastInterviews = application.interviews.filter((i) => i.id !== currentInterview?.id);

  const activity = await prisma.auditLog.findMany({
    where: { entityType: "Application", entityId: application.id },
    orderBy: { createdAt: "desc" },
  });

  const valuesByField = new Map(application.fieldValues.map((v) => [v.fieldId, v]));

  const tabHref = (key: string) => `/applications/${application.id}?tab=${key}`;

  const initials = application.candidate.fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  const verifiedDocs = application.documents.filter((d) => d.verified).length;

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-orange-100 text-lg font-semibold text-orange-700 ring-4 ring-orange-50">
              {initials || "?"}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold tracking-tight text-slate-900">{application.candidate.fullName}</h1>
                <StatusBadge
                  status={application.status}
                  label={APPLICATION_STATUS_LABELS[application.status as keyof typeof APPLICATION_STATUS_LABELS] ?? application.status}
                />
              </div>
              <p className="mt-0.5 text-sm text-slate-500">
                {application.applicationNumber} ·{" "}
                <Link href={`/jobs/${application.job.id}`} className="text-orange-700 hover:underline">
                  {application.job.title}
                </Link>{" "}
                · {application.job.department?.name ?? "No department"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a href={`/api/applications/${application.id}/synopsis`}>
              <Button variant="secondary" size="sm">
                Download Synopsis
              </Button>
            </a>
            <form action={changeApplicationStatus} className="flex items-center gap-2">
              <input type="hidden" name="applicationId" value={application.id} />
              <select name="status" defaultValue={application.status} className={`${inputClass} w-52`}>
                {SETTABLE_APPLICATION_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {APPLICATION_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
              <Button type="submit" variant="secondary" size="sm">
                Update Status
              </Button>
            </form>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile
          label="Applied"
          icon={IconCalendar}
          value={
            application.submittedAt
              ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(application.submittedAt)
              : "Draft"
          }
        />
        <StatTile
          label="Documents"
          icon={IconCheckCircle}
          tone={verifiedDocs === application.documents.length && application.documents.length > 0 ? "success" : "warning"}
          value={`${verifiedDocs} / ${application.documents.length} verified`}
        />
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={tabHref(t.key)}
            className={`px-3 py-2 text-sm font-medium ${
              tab === t.key
                ? "border-b-2 border-orange-600 text-orange-700"
                : "border-b-2 border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {tab === "profile" && (
        <Card>
          <CardHeader title="Candidate profile" description="Core identity details, shared across every application from this candidate." />
          <dl className="grid grid-cols-1 gap-x-8 gap-y-5 px-5 py-5 sm:grid-cols-3">
            <Detail label="Full name" value={application.candidate.fullName} />
            <Detail label="Email" value={application.candidate.email} />
            <Detail label="Mobile" value={application.candidate.mobile} />
            <Detail
              label="Date of birth"
              value={
                application.candidate.dateOfBirth
                  ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(application.candidate.dateOfBirth)
                  : null
              }
            />
            <Detail label="Gender" value={application.candidate.gender} />
          </dl>
        </Card>
      )}

      {tab === "application" && (
        <div className="space-y-4">
          {application.job.form ? (
            application.job.form.sections.map((section) => (
              <Card key={section.id}>
                <CardHeader title={section.name} />
                <dl className="grid grid-cols-1 gap-x-8 gap-y-4 px-5 py-5 sm:grid-cols-2">
                  {section.fields.map((field) => {
                    const value = valuesByField.get(field.id);
                    const raw = value?.valueText || (value?.valueNumber !== null && value?.valueNumber !== undefined ? String(value.valueNumber) : "—");
                    return <FieldValue key={field.id} label={field.label} value={raw} />;
                  })}
                </dl>
              </Card>
            ))
          ) : (
            <EmptyState title="No application form configured for this job" />
          )}
        </div>
      )}

      {tab === "documents" && (
        // No overflow-hidden here — the document thumbnails intentionally
        // scale up past their cell on hover, which a clipped ancestor
        // would cut off.
        <Card className="overflow-visible">
          <CardHeader title="Documents" description={`${application.documents.length} uploaded`} />
          {application.documents.length === 0 ? (
            <div className="p-5">
              <EmptyState title="No documents uploaded" />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2.5">Preview</th>
                  <th className="px-4 py-2.5">Type</th>
                  <th className="px-4 py-2.5">Link</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {application.documents.map((doc) => (
                  <tr key={doc.id}>
                    <td className="px-4 py-3">
                      {doc.externalUrl ? (
                        <DocumentThumbnail url={doc.externalUrl} label={doc.documentType} />
                      ) : (
                        <span className="text-xs italic text-slate-400">No preview</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{doc.documentType}</td>
                    <td className="px-4 py-3">
                      {doc.externalUrl ? (
                        <a
                          href={doc.externalUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-orange-600 hover:underline"
                        >
                          Open
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {doc.verified ? <Badge tone="green">Verified</Badge> : <Badge tone="amber">Pending</Badge>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {doc.verified ? (
                        <form action={unverifyDocumentAction}>
                          <input type="hidden" name="documentId" value={doc.id} />
                          <Button type="submit" size="sm" variant="ghost">
                            Unverify
                          </Button>
                        </form>
                      ) : (
                        <form action={verifyDocumentAction}>
                          <input type="hidden" name="documentId" value={doc.id} />
                          <Button type="submit" size="sm" variant="secondary">
                            Mark Verified
                          </Button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {tab === "interview" && (
        <div className="space-y-4">
          <Card>
            <CardHeader
              title={currentInterview ? "Reschedule interview" : "Schedule interview"}
              description={
                currentInterview
                  ? "Saving changes updates this same interview and re-notifies whoever's tracking it."
                  : "Sets the application status to “Interview Scheduled”."
              }
            />
            <form action={scheduleInterview} className="grid grid-cols-1 gap-4 px-5 py-5 sm:grid-cols-2">
              <input type="hidden" name="applicationId" value={application.id} />
              <Field label="Date & time" htmlFor="scheduledAt" required>
                <input
                  id="scheduledAt"
                  name="scheduledAt"
                  type="datetime-local"
                  required
                  defaultValue={currentInterview ? toDatetimeLocalValue(currentInterview.scheduledAt) : undefined}
                  className={inputClass}
                />
              </Field>
              <Field label="Duration (minutes)" htmlFor="durationMinutes">
                <input
                  id="durationMinutes"
                  name="durationMinutes"
                  type="number"
                  min={5}
                  step={5}
                  defaultValue={currentInterview?.durationMinutes ?? 30}
                  className={inputClass}
                />
              </Field>
              <Field label="Mode" htmlFor="mode">
                <select id="mode" name="mode" defaultValue={currentInterview?.mode ?? "in_person"} className={inputClass}>
                  {INTERVIEW_MODES.map((m) => (
                    <option key={m} value={m}>
                      {INTERVIEW_MODE_LABELS[m]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Location / link" htmlFor="location" hint="Room number, address, or a video call link — whatever fits the mode.">
                <input id="location" name="location" defaultValue={currentInterview?.location ?? ""} className={inputClass} />
              </Field>
              <Field
                label="Panel members"
                htmlFor="panelistNames"
                hint="Free text — e.g. “Dr. A Sharma, Prof. B Singh”."
              >
                <input id="panelistNames" name="panelistNames" defaultValue={currentInterview?.panelistNames ?? ""} className={inputClass} />
              </Field>
              <Field label="Notes" htmlFor="notes">
                <input id="notes" name="notes" defaultValue={currentInterview?.notes ?? ""} className={inputClass} />
              </Field>
              <div className="sm:col-span-2 flex justify-end border-t border-slate-100 pt-4">
                <Button type="submit">{currentInterview ? "Save Changes" : "Schedule Interview"}</Button>
              </div>
            </form>
          </Card>

          {currentInterview && (
            <Card className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(currentInterview.scheduledAt)}
                    <span className="ml-2 text-slate-400">·</span>
                    <span className="ml-2 text-slate-500">{INTERVIEW_MODE_LABELS[currentInterview.mode as keyof typeof INTERVIEW_MODE_LABELS] ?? currentInterview.mode}</span>
                  </p>
                  {currentInterview.panelistNames && <p className="mt-0.5 text-xs text-slate-500">Panel: {currentInterview.panelistNames}</p>}
                </div>
                <div className="flex gap-2">
                  <form action={markInterviewCompleted}>
                    <input type="hidden" name="interviewId" value={currentInterview.id} />
                    <Button type="submit" size="sm" variant="secondary">
                      Mark Completed
                    </Button>
                  </form>
                  <form action={cancelInterview}>
                    <input type="hidden" name="interviewId" value={currentInterview.id} />
                    <Button type="submit" size="sm" variant="danger">
                      Cancel
                    </Button>
                  </form>
                </div>
              </div>
            </Card>
          )}

          {pastInterviews.length > 0 && (
            <Card>
              <CardHeader title="Interview history" />
              <ul className="divide-y divide-slate-100">
                {pastInterviews.map((iv) => (
                  <li key={iv.id} className="flex items-center justify-between px-5 py-3 text-sm">
                    <span className="text-slate-700">
                      {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(iv.scheduledAt)}
                      <span className="ml-2 text-slate-400">·</span>
                      <span className="ml-2 text-slate-500">{INTERVIEW_MODE_LABELS[iv.mode as keyof typeof INTERVIEW_MODE_LABELS] ?? iv.mode}</span>
                    </span>
                    <Badge tone={iv.status === "completed" ? "green" : iv.status === "cancelled" ? "red" : "slate"}>
                      {INTERVIEW_STATUS_LABELS[iv.status as keyof typeof INTERVIEW_STATUS_LABELS] ?? iv.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}

      {tab === "email" && (
        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Email candidate"
              description={`Sends directly to ${application.candidate.email}. Separate from the automatic interview-scheduling email.`}
            />
            <form action={sendCandidateEmail} className="space-y-4 px-5 py-5">
              <input type="hidden" name="applicationId" value={application.id} />
              <Field label="Subject" htmlFor="emailSubject" required>
                <input
                  id="emailSubject"
                  name="subject"
                  required
                  defaultValue={application.tenant.interviewEmailSubject || DEFAULT_INTERVIEW_EMAIL_SUBJECT}
                  className={inputClass}
                />
              </Field>
              <Field label="Message" htmlFor="emailBody" required hint={<PlaceholderChips names={INTERVIEW_EMAIL_PLACEHOLDERS} />}>
                <textarea
                  id="emailBody"
                  name="body"
                  rows={8}
                  required
                  defaultValue={application.tenant.interviewEmailBody || DEFAULT_INTERVIEW_EMAIL_BODY}
                  className={`${inputClass} resize-y font-mono text-xs`}
                />
              </Field>
              <p className="text-xs text-slate-500">
                Prefilled from the tenant&apos;s Interview email template — edit freely. Placeholders resolve using this
                candidate&apos;s own data; scheduling ones are blank if there&apos;s no interview on record.
              </p>
              <div className="flex justify-end border-t border-slate-100 pt-4">
                <Button type="submit">Send Email</Button>
              </div>
            </form>
          </Card>

          {(() => {
            const sentEmails = activity.filter((entry) => entry.action === "email.sent");
            if (sentEmails.length === 0) return null;
            return (
              <Card>
                <CardHeader title="Sent emails" />
                <ul className="divide-y divide-slate-100">
                  {sentEmails.map((entry) => {
                    let subject = "";
                    let sent = true;
                    try {
                      const meta = entry.metadataJson ? JSON.parse(entry.metadataJson) : {};
                      subject = meta.subject ?? "";
                      sent = meta.sent !== false;
                    } catch {
                      // Malformed metadata — still show the entry, just without a subject.
                    }
                    return (
                      <li key={entry.id} className="flex items-center justify-between px-5 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-700">{subject || "(no subject)"}</span>
                          {!sent && <Badge tone="red">Failed</Badge>}
                        </div>
                        <span className="text-xs text-slate-400">
                          {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(entry.createdAt)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            );
          })()}
        </div>
      )}

      {tab === "activity" && (
        <Card>
          <CardHeader title="Activity timeline" />
          {activity.length === 0 ? (
            <div className="p-5">
              <EmptyState title="No activity recorded yet" />
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {activity.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between px-5 py-3 text-sm">
                  <span className="text-slate-700">
                    <span className="font-medium text-slate-900">{entry.actorName}</span>{" "}
                    {ACTION_LABELS[entry.action] ?? entry.action}
                  </span>
                  <span className="text-xs text-slate-400">
                    {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(entry.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}

// The original Sheet packed some cells into a single delimited string,
// e.g. "Roll No.:75436,Year of Passing:2001,Division:Second,...". Splits
// it back into labelled sub-fields instead of one unreadable line — only
// where the comma is immediately followed by another "Label:" (so a
// value that itself contains commas, like a subject list, stays intact).
function parseCompoundValue(raw: string): { label: string; value: string }[] | null {
  if (!raw.includes(":") || !raw.includes(",")) return null;
  const parts = raw.split(/,(?=[A-Za-z][^,:]{0,40}:)/);
  const pairs: { label: string; value: string }[] = [];
  for (const part of parts) {
    const idx = part.indexOf(":");
    if (idx === -1) return null;
    const label = part.slice(0, idx).trim();
    if (!label) return null;
    pairs.push({ label, value: part.slice(idx + 1).trim() });
  }
  return pairs.length >= 2 ? pairs : null;
}

function FieldValue({ label, value }: { label: string; value: string }) {
  const pairs = parseCompoundValue(value);
  if (!pairs) return <Detail label={label} value={value} />;

  return (
    <div className="sm:col-span-2">
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1.5 grid grid-cols-1 gap-x-6 gap-y-1 rounded-md border border-slate-100 bg-slate-50/60 px-3 py-2 sm:grid-cols-2">
        {pairs.map((p, i) => (
          <div key={i} className="flex flex-wrap gap-x-1.5 text-sm">
            <span className="text-slate-500">{p.label}:</span>
            <span className="font-medium text-slate-800">{p.value || "—"}</span>
          </div>
        ))}
      </dd>
    </div>
  );
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  const isEmpty = !value || value === "—";
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className={`mt-0.5 text-sm ${isEmpty ? "italic text-slate-400" : "text-slate-800"}`}>
        {isEmpty ? "Not provided" : value}
      </dd>
    </div>
  );
}
