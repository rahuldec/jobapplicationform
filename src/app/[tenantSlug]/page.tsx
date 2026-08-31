import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getTenantBranding } from "@/lib/branding";
import { Field, inputClass, Button } from "@/components/ui/primitives";
import { loginToTenant } from "@/lib/actions/tenant-auth";

// Per-client entry link, e.g. /dn — gated by the shared credentials Sheet
// (tenant/username/password columns, see src/lib/tenant-auth.ts) before
// granting access to that institution's portal. Only matches single-
// segment paths that aren't one of the app's own top-level routes
// (dashboard, jobs, applications, apply, api, admin, manual), since Next
// resolves those literal folders first.
export default async function TenantLoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { tenantSlug } = await params;
  const { error } = await searchParams;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) notFound();

  const branding = getTenantBranding(tenant);
  const gradientCss = `linear-gradient(90deg, ${branding.gradient.from} 0%, ${branding.gradient.via} 50%, ${branding.gradient.to} 100%)`;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="h-1.5 w-full shrink-0" style={{ background: gradientCss }} />
        <div className="px-6 py-8">
          {branding.logoDataUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={branding.logoDataUrl} alt="" className="mx-auto mb-4 h-14 w-auto object-contain" />
          )}
          <h1 className="text-center text-lg font-semibold text-slate-900">{branding.name}</h1>
          <p className="mt-1 text-center text-sm text-slate-500">Sign in to continue</p>

          <form action={loginToTenant} className="mt-6 space-y-4">
            <input type="hidden" name="slug" value={tenant.slug} />
            <Field label="Username" htmlFor="username">
              <input id="username" name="username" required autoFocus className={inputClass} />
            </Field>
            <Field label="Password" htmlFor="password">
              <input id="password" name="password" type="password" required className={inputClass} />
            </Field>
            {error && <p className="text-sm text-red-600">Incorrect username or password.</p>}
            <Button type="submit" className="w-full justify-center">
              Sign in
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
