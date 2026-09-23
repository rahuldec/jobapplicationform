import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardHeader, Badge, EmptyState, Field, inputClass, Button } from "@/components/ui/primitives";
import { APPLICATION_STATUS_LABELS } from "@/lib/enums";
import { formatDateTime } from "@/lib/date";

// Same staleness problem as /admin itself (no cookies()/headers(), only
// direct Prisma reads) — force dynamic so new activity shows up without
// waiting for the next deploy.
export const dynamic = "force-dynamic";

const PAGE_SIZE = 40;

// Every action string written via prisma.auditLog.create/createMany across
// the app (grep for `action:` in src/lib/actions/*.ts) — kept here rather
// than centralized since each page that renders AuditLog entries only
// needs to label the subset it actually shows (see the application detail
// page's own ACTION_LABELS), and this is the one place that shows all of
// them across every tenant at once.
const ACTION_LABELS: Record<string, string> = {
  "tenant.login": "logged in",
  "application.submitted": "received a new application",
  "application.status_changed": "changed an application's status",
  "application.assigned": "assigned an application to a recruiter",
  "email.sent": "sent a candidate email",
  "document.verified": "verified a document",
  "document.unverified": "un-verified a document",
  "interview.scheduled": "scheduled an interview",
  "interview.rescheduled": "rescheduled an interview",
  "interview.completed": "marked an interview completed",
  "interview.cancelled": "cancelled an interview",
  "job.created": "created a job posting",
  "job.published": "published a job posting",
  "job.closed": "closed a job posting",
};

const ACTION_TONES: Record<string, "slate" | "blue" | "amber" | "green" | "red" | "purple"> = {
  "tenant.login": "green",
  "application.submitted": "blue",
  "application.status_changed": "amber",
  "application.assigned": "amber",
  "email.sent": "purple",
  "document.verified": "green",
  "document.unverified": "slate",
  "interview.scheduled": "purple",
  "interview.rescheduled": "purple",
  "interview.completed": "green",
  "interview.cancelled": "red",
  "job.created": "slate",
  "job.published": "green",
  "job.closed": "slate",
};

// Best-effort detail line from an entry's metadataJson — every action
// stores a different shape (see the actions files), so this only handles
// the ones with something worth surfacing; anything else (or malformed
// JSON) just shows the plain action label with no subtitle.
function describeEntry(action: string, metadataJson: string | null): string | null {
  if (!metadataJson) return null;
  try {
    const meta = JSON.parse(metadataJson);
    switch (action) {
      case "application.status_changed":
        return meta.status ? `→ ${APPLICATION_STATUS_LABELS[meta.status as never] ?? meta.status}` : null;
      case "application.assigned":
        return meta.recruiterName ? `→ ${meta.recruiterName}` : null;
      case "email.sent":
        return meta.subject ? `"${meta.subject}"${meta.sent === false ? " (failed)" : ""}` : null;
      default:
        return null;
    }
  } catch {
    return null;
  }
}

export default async function AdminActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ tenantId?: string; action?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1) || 1);

  const where = {
    tenantId: params.tenantId || undefined,
    action: params.action || undefined,
  };

  const [entries, total, tenants] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { tenant: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.auditLog.count({ where }),
    prisma.tenant.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const buildHref = (overrides: Record<string, string | undefined>) => {
    const next = new URLSearchParams();
    const merged = { ...params, ...overrides };
    for (const [k, v] of Object.entries(merged)) {
      if (v) next.set(k, v);
    }
    const qs = next.toString();
    return qs ? `/admin/activity?${qs}` : "/admin/activity";
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Activity</h1>
        <p className="text-sm text-slate-500">What every client is doing on this portal — logins, applications, emails, interviews, and job postings.</p>
      </div>

      <Card className="p-4">
        <form method="get" className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_1fr_auto]">
          <Field label="Client" htmlFor="tenantId">
            <select id="tenantId" name="tenantId" defaultValue={params.tenantId ?? ""} className={inputClass}>
              <option value="">All clients</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Action" htmlFor="action">
            <select id="action" name="action" defaultValue={params.action ?? ""} className={inputClass}>
              <option value="">All actions</option>
              {Object.entries(ACTION_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <div className="flex items-end">
            <Button type="submit">Filter</Button>
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader title={`${total} event${total === 1 ? "" : "s"}`} />
        {entries.length === 0 ? (
          <div className="p-5">
            <EmptyState title="No activity found" description="Try adjusting the filters above." />
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {entries.map((entry) => {
              const detail = describeEntry(entry.action, entry.metadataJson);
              return (
                <li key={entry.id} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {entry.tenant ? (
                        <Link href={`/admin/${entry.tenant.id}`} className="font-medium text-orange-600 hover:underline">
                          {entry.tenant.name}
                        </Link>
                      ) : (
                        <span className="font-medium text-slate-400">(no client)</span>
                      )}
                      <Badge tone={ACTION_TONES[entry.action] ?? "slate"}>{ACTION_LABELS[entry.action] ?? entry.action}</Badge>
                    </div>
                    {detail && <p className="mt-1 truncate text-xs text-slate-500">{detail}</p>}
                  </div>
                  <span className="shrink-0 text-xs text-slate-400">{formatDateTime(entry.createdAt)}</span>
                </li>
              );
            })}
          </ul>
        )}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-sm text-slate-500">
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
      </Card>
    </div>
  );
}
