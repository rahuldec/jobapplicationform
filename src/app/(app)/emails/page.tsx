import Link from "next/link";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { getCurrentTenant } from "@/lib/tenant";
import { Card, EmptyState, Badge, StatTile } from "@/components/ui/primitives";
import { IconCheckCircle, IconXCircle } from "@/components/ui/icons";
import { EmailsFilters } from "./emails-filters";

const PAGE_SIZE = 30;
// Emails are read from the generic audit log (no dedicated table), so
// filtering/searching happens in memory after a bounded fetch — simplest
// approach for a volume that realistically stays in the hundreds/low
// thousands per tenant. Revisit with a real query (or a dedicated table)
// if a tenant's history ever outgrows this cap.
const MAX_LOGS = 2000;

type EmailRow = {
  id: string;
  createdAt: Date;
  subject: string;
  sent: boolean;
  error?: string;
  bulk: boolean;
  applicationId: string;
  applicationNumber: string;
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
};

export default async function EmailsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const tenant = await getCurrentTenant();

  const logs = await prisma.auditLog.findMany({
    where: { tenantId: tenant.id, action: "email.sent" },
    orderBy: { createdAt: "desc" },
    take: MAX_LOGS,
  });

  const applicationIds = [...new Set(logs.map((l) => l.entityId))];
  const applications = await prisma.application.findMany({
    where: { id: { in: applicationIds } },
    include: { candidate: true, job: true },
  });
  const appById = new Map(applications.map((a) => [a.id, a]));

  const allRows: EmailRow[] = logs.map((log) => {
    let subject = "";
    let sent = true;
    let error: string | undefined;
    let bulk = false;
    try {
      const meta = log.metadataJson ? JSON.parse(log.metadataJson) : {};
      subject = meta.subject ?? "";
      sent = meta.sent !== false;
      error = meta.error;
      bulk = Boolean(meta.bulk);
    } catch {
      // Malformed metadata — still show the entry, just without these details.
    }
    const app = appById.get(log.entityId);
    return {
      id: log.id,
      createdAt: log.createdAt,
      subject,
      sent,
      error,
      bulk,
      applicationId: log.entityId,
      applicationNumber: app?.applicationNumber ?? "—",
      candidateName: app?.candidate.fullName ?? "(application removed)",
      candidateEmail: app?.candidate.email ?? "",
      jobTitle: app?.job.title ?? "",
    };
  });

  const sentCount = allRows.filter((r) => r.sent).length;
  const failedCount = allRows.length - sentCount;

  let rows = allRows;
  if (params.status === "sent") rows = rows.filter((r) => r.sent);
  else if (params.status === "failed") rows = rows.filter((r) => !r.sent);
  if (params.q) {
    const q = params.q.toLowerCase();
    rows = rows.filter(
      (r) =>
        r.candidateName.toLowerCase().includes(q) ||
        r.candidateEmail.toLowerCase().includes(q) ||
        r.subject.toLowerCase().includes(q) ||
        r.applicationNumber.toLowerCase().includes(q),
    );
  }

  const page = Math.max(1, Number(params.page ?? 1) || 1);
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const buildHref = (overrides: Record<string, string | undefined>) => {
    const next = new URLSearchParams();
    const merged = { ...params, ...overrides };
    for (const [k, v] of Object.entries(merged)) {
      if (v) next.set(k, v);
    }
    const qs = next.toString();
    return qs ? `/emails?${qs}` : "/emails";
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Emails</h1>
        <p className="text-sm text-slate-500">
          {allRows.length} sent · {tenant.name}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatTile label="Sent" value={sentCount} tone="success" icon={IconCheckCircle} />
        <StatTile label="Failed" value={failedCount} tone="danger" icon={IconXCircle} />
      </div>

      <Card className="p-4">
        <Suspense fallback={null}>
          <EmailsFilters />
        </Suspense>
      </Card>

      <Card className="overflow-hidden">
        {pageRows.length === 0 ? (
          <EmptyState
            title={allRows.length === 0 ? "No emails sent yet" : "No emails match your filters"}
            description={allRows.length === 0 ? "Emails sent from an application, or in bulk, will show up here." : "Try adjusting your search or status filter."}
          />
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2.5">Sent</th>
                  <th className="px-4 py-2.5">Candidate</th>
                  <th className="px-4 py-2.5">Application</th>
                  <th className="px-4 py-2.5">Job</th>
                  <th className="px-4 py-2.5">Subject</th>
                  <th className="px-4 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pageRows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                      {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(row.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {row.candidateName}
                      {row.candidateEmail && <p className="text-xs text-slate-400">{row.candidateEmail}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/applications/${row.applicationId}?tab=email`} className="font-medium text-orange-600 hover:underline">
                        {row.applicationNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{row.jobTitle}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {row.subject || <span className="text-slate-400 italic">(no subject)</span>}
                      {row.bulk && (
                        <span className="ml-1.5">
                          <Badge tone="slate">bulk</Badge>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {row.sent ? (
                        <Badge tone="green">Sent</Badge>
                      ) : (
                        <span title={row.error} className="inline-flex">
                          <Badge tone="red">Failed</Badge>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
