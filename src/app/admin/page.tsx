import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createTenant } from "@/lib/actions/tenants";
import { Card, CardHeader, Field, inputClass, Button, EmptyState, OverviewCard, OverviewSubTile } from "@/components/ui/primitives";
import { formatDateTime } from "@/lib/date";

// This page has no cookies()/headers() usage to signal dynamic rendering
// to Next, and its only data source is a direct Prisma call (not a
// fetch()) — so without this, Next prerenders it once at build time and
// serves that same static snapshot until the next deploy. createTenant
// already calls revalidatePath("/admin") for additions made through the
// app itself, but a tenant removed any other way (direct DB access) has
// no such hook, so the client list can go stale indefinitely otherwise.
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [tenants, lastLogins, totalApplications, totalJobs] = await Promise.all([
    prisma.tenant.findMany({ orderBy: { createdAt: "asc" } }),
    // One grouped query for every tenant's most recent login, rather than
    // N queries per row — see src/lib/actions/tenant-auth.ts for where
    // "tenant.login" gets written.
    prisma.auditLog.groupBy({ by: ["tenantId"], where: { action: "tenant.login" }, _max: { createdAt: true } }),
    prisma.application.count(),
    prisma.job.count(),
  ]);
  const lastLoginByTenant = new Map(lastLogins.map((l) => [l.tenantId, l._max.createdAt]));
  // lastLogins only has a row per tenant that has ever logged in
  // (groupBy skips tenants with zero matching rows), so its length is
  // exactly the "has logged in at least once" count.
  const loggedInCount = lastLogins.length;
  const activePct = tenants.length > 0 ? (loggedInCount / tenants.length) * 100 : 0;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Clients</h1>
        <p className="text-sm text-slate-500">Every tenant configured on this portal, and their entry link.</p>
      </div>

      <OverviewCard title="Recruitment Ops Portal" badgeLabel={`${activePct.toFixed(0)}% have logged in`}>
        <OverviewSubTile label="Total clients" value={tenants.length} color="#64748b" />
        <OverviewSubTile label="Logged in" value={loggedInCount} color="#10b981" href="/admin/activity?action=tenant.login" />
        <OverviewSubTile label="Total applications" value={totalApplications} color="#3b82f6" href="/admin/activity" />
        <OverviewSubTile label="Total jobs" value={totalJobs} color="#8b5cf6" />
      </OverviewCard>

      <Card>
        <CardHeader title="Existing clients" />
        {tenants.length === 0 ? (
          <div className="p-5">
            <EmptyState title="No clients yet" />
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {tenants.map((t) => (
              <li key={t.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <Link href={`/admin/${t.id}`} className="font-medium text-orange-600 hover:underline">
                    {t.name}
                  </Link>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Entry link: <code className="text-slate-600">/{t.slug}</code>
                    {" · "}
                    {lastLoginByTenant.get(t.id) ? (
                      <>Last login: {formatDateTime(lastLoginByTenant.get(t.id)!)}</>
                    ) : (
                      <span className="text-slate-400">Never logged in</span>
                    )}
                  </p>
                </div>
                <Link href={`/admin/${t.id}`} className="text-xs font-medium text-slate-500 hover:text-slate-800">
                  Configure →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader title="Add a new client" description="Creates the tenant. Branding and Sheet sync are configured after." />
        <form action={createTenant} className="grid grid-cols-1 gap-4 px-5 py-5 sm:grid-cols-[1fr_1fr_auto]">
          <Field label="Client name" htmlFor="name" required>
            <input id="name" name="name" required className={inputClass} placeholder="Doon Nagar College" />
          </Field>
          <Field label="Slug (used in the entry link)" htmlFor="slug" hint="Leave blank to derive from the name.">
            <input id="slug" name="slug" className={inputClass} placeholder="dn" />
          </Field>
          <div className="flex items-end">
            <Button type="submit">Create client</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
