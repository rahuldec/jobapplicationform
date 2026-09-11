import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getTenantBranding } from "@/lib/branding";
import { Field, inputClass, Button } from "@/components/ui/primitives";
import { TenantLoginPasswordField } from "@/components/tenant-login-password-field";
import { loginToTenant } from "@/lib/actions/tenant-auth";

const FEATURES = [
  { label: "Post Openings" },
  { label: "Review Applications" },
  { label: "Schedule Interviews" },
];

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
  const gradientCss = `linear-gradient(135deg, ${branding.gradient.from} 0%, ${branding.gradient.via} 55%, ${branding.gradient.to} 100%)`;

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Branding panel — hidden on small screens, where the logo/name inside the card below is enough. */}
      <div className="relative hidden w-[46%] shrink-0 overflow-hidden md:flex md:flex-col md:justify-between md:p-12" style={{ background: gradientCss }}>
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-white/10" />

        <div className="relative">
          {branding.logoDataUrl && (
            <div className="mb-8 inline-flex rounded-2xl bg-white p-3 shadow-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={branding.logoDataUrl} alt="" className="h-14 w-14 object-contain" />
            </div>
          )}
          <h1 className="text-4xl font-bold leading-tight text-white">{branding.name}</h1>
          <div className="mt-4 h-1 w-16 rounded-full bg-white/60" />
          <p className="mt-4 max-w-sm text-sm font-medium uppercase tracking-widest text-white/70">
            {branding.tagline || "Recruitment Portal"}
          </p>
        </div>

        <div className="relative flex gap-8">
          {FEATURES.map((f) => (
            <div key={f.label} className="flex items-center gap-2.5 text-sm font-medium text-white/85">
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 shrink-0 text-white/70" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                  clipRule="evenodd"
                />
              </svg>
              {f.label}
            </div>
          ))}
        </div>
      </div>

      {/* Sign-in panel */}
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
            <div className="px-6 py-8">
              {branding.logoDataUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={branding.logoDataUrl} alt="" className="mx-auto mb-4 h-14 w-auto object-contain" />
              )}
              <h2 className="text-center text-lg font-semibold text-slate-900">{branding.name}</h2>
              <p className="mt-1 text-center text-sm text-slate-500">Sign in to your account</p>

              <form action={loginToTenant} className="mt-6 space-y-4">
                <input type="hidden" name="slug" value={tenant.slug} />
                <Field label="Username" htmlFor="username">
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                        <path
                          fillRule="evenodd"
                          d="M10 8a3 3 0 100-6 3 3 0 000 6zm-7 8a7 7 0 1114 0H3z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </span>
                    <input id="username" name="username" required autoFocus className={`${inputClass} pl-9`} />
                  </div>
                </Field>
                <Field label="Password" htmlFor="password">
                  <TenantLoginPasswordField />
                </Field>
                {error === "1" && <p className="text-sm text-red-600">Incorrect username or password.</p>}
                {error === "2" && (
                  <p className="text-sm text-red-600">Couldn&apos;t check your credentials right now — please try again in a moment.</p>
                )}
                <Button type="submit" className="w-full justify-center gap-2">
                  Sign in
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                    <path
                      fillRule="evenodd"
                      d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z"
                      clipRule="evenodd"
                    />
                  </svg>
                </Button>
              </form>

              <p className="mt-5 text-center text-xs text-slate-400">
                Trouble signing in? Contact your organization&apos;s administrator.
              </p>
            </div>
          </div>

          <a
            href="https://okiedokiepay.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 flex items-center justify-center gap-2 text-slate-400 transition-colors hover:text-slate-600"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/okie-dokie-logo.png" alt="" className="h-5 w-5 opacity-70" />
            <span className="text-xs font-medium">Powered by Okie Dokie</span>
          </a>
        </div>
      </div>
    </div>
  );
}
