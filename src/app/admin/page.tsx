import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createTenant } from "@/lib/actions/tenants";
import { Card, CardHeader, Field, inputClass, Button, EmptyState } from "@/components/ui/primitives";

export default async function AdminPage() {
  const tenants = await prisma.tenant.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Clients</h1>
        <p className="text-sm text-slate-500">Every tenant configured on this portal, and their entry link.</p>
      </div>

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
