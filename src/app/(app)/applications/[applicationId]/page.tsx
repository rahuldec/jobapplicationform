import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  changeApplicationStatus,
  calculateScoreAction,
  overrideScoreAction,
  verifyDocumentAction,
  unverifyDocumentAction,
} from "@/lib/actions/applications";
import { Card, CardHeader, StatusBadge, Badge, Button, EmptyState, inputClass, StatTile } from "@/components/ui/primitives";
import { APPLICATION_STATUS_LABELS, SETTABLE_APPLICATION_STATUSES } from "@/lib/enums";
import { IconCalendar, IconStar, IconCheckCircle, IconUsers } from "@/components/ui/icons";
import { DocumentThumbnail } from "@/components/documents/document-thumbnail";
import type { ScoreBreakdownEntry } from "@/lib/scoring/types";

const TABS = [
  { key: "profile", label: "Profile" },
  { key: "application", label: "Application" },
  { key: "documents", label: "Documents" },
  { key: "scoring", label: "Scoring" },
  { key: "activity", label: "Activity" },
] as const;

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
      job: {
        include: {
          department: true,
          form: { include: { sections: { include: { fields: true }, orderBy: { order: "asc" } } } },
          scoringPattern: { include: { versions: { where: { status: "published" } } } },
        },
      },
      fieldValues: { include: { field: true } },
      documents: { orderBy: { uploadedAt: "desc" } },
      scores: { include: { version: true }, orderBy: { calculatedAt: "desc" } },
      assignedRecruiter: true,
    },
  });

  if (!application) notFound();

  const publishedVersion = application.job.scoringPattern?.versions[0];
  const currentScore = application.scores.find((s) => s.versionId === publishedVersion?.id) ?? application.scores[0];

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

  const finalScore = currentScore?.overrideScore ?? currentScore?.calculatedScore;
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
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
          label="Score"
          icon={IconStar}
          tone={finalScore !== undefined ? "brand" : "default"}
          value={finalScore !== undefined ? `${finalScore} / ${currentScore?.calculatedMaxScore ?? "?"}` : "Not calculated"}
        />
        <StatTile
          label="Documents"
          icon={IconCheckCircle}
          tone={verifiedDocs === application.documents.length && application.documents.length > 0 ? "success" : "warning"}
          value={`${verifiedDocs} / ${application.documents.length} verified`}
        />
        <StatTile label="Recruiter" icon={IconUsers} value={application.assignedRecruiter?.name ?? "Unassigned"} />
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
            <Detail label="Candidate since" value={new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(application.candidate.createdAt)} />
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

      {tab === "scoring" && (
        <ScoringTab
          application={application}
          publishedVersion={publishedVersion}
          currentScore={currentScore}
        />
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
                    <span className="font-medium text-slate-900">{entry.actorName}</span> — {entry.action}
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

function ScoringTab({
  application,
  publishedVersion,
  currentScore,
}: {
  application: { id: string };
  publishedVersion?: { id: string; versionNumber: number; maxScore: number | null };
  currentScore?: {
    id: string;
    calculatedScore: number;
    calculatedMaxScore: number | null;
    calculatedBreakdownJson: string;
    overrideScore: number | null;
    overrideReason: string | null;
  };
}) {
  if (!publishedVersion) {
    return (
      <Card>
        <div className="p-5">
          <EmptyState
            title="No published scoring pattern for this job"
            description="Attach and publish a scoring pattern on the job to enable scoring."
          />
        </div>
      </Card>
    );
  }

  const breakdown: ScoreBreakdownEntry[] = currentScore ? JSON.parse(currentScore.calculatedBreakdownJson) : [];
  const finalScore = currentScore?.overrideScore ?? currentScore?.calculatedScore;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Score"
          description={`Pattern version ${publishedVersion.versionNumber}`}
          action={
            <form action={calculateScoreAction} className="flex items-center gap-2">
              <input type="hidden" name="applicationId" value={application.id} />
              <input type="hidden" name="versionId" value={publishedVersion.id} />
              <Button type="submit" size="sm">
                {currentScore ? "Recalculate" : "Calculate Score"}
              </Button>
            </form>
          }
        />
        <div className="px-5 py-5">
          {currentScore ? (
            <>
              <p className="text-3xl font-semibold tabular-nums text-slate-900">
                {finalScore} <span className="text-base font-normal text-slate-400">/ {currentScore.calculatedMaxScore ?? "?"}</span>
              </p>
              {currentScore.overrideScore !== null && (
                <p className="mt-1 text-xs text-amber-600">
                  Manually overridden from {currentScore.calculatedScore} — reason: {currentScore.overrideReason}
                </p>
              )}
              <table className="mt-5 w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="py-2">Criterion</th>
                    <th className="py-2">Detail</th>
                    <th className="py-2 text-right">Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {breakdown.map((b) => (
                    <tr key={b.criterionId}>
                      <td className="py-2.5 font-medium text-slate-800">{b.name}</td>
                      <td className="py-2.5 text-slate-500">{b.detail}</td>
                      <td className="py-2.5 text-right tabular-nums text-slate-800">
                        {b.points} / {b.maxPoints}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <EmptyState title="Not calculated yet" description="Click Calculate Score to run the scoring engine." />
          )}
        </div>
      </Card>

      {currentScore && (
        <Card>
          <CardHeader title="Manual override" description="The original calculated score is always preserved." />
          <form action={overrideScoreAction} className="grid grid-cols-1 gap-3 px-5 py-5 sm:grid-cols-[160px_1fr_auto]">
            <input type="hidden" name="scoreId" value={currentScore.id} />
            <input
              name="overrideScore"
              type="number"
              step="0.01"
              placeholder="New score"
              defaultValue={currentScore.overrideScore ?? undefined}
              className={inputClass}
              required
            />
            <input
              name="overrideReason"
              placeholder="Reason for override"
              defaultValue={currentScore.overrideReason ?? undefined}
              className={inputClass}
              required
            />
            <Button type="submit" variant="secondary">
              Save Override
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}
