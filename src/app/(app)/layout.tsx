import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { getCurrentTenant } from "@/lib/tenant";
import { getTenantBranding } from "@/lib/branding";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/jobs", label: "Jobs" },
  { href: "/applications", label: "Applications" },
];

export default async function AppLayout({ children }: { children: ReactNode }) {
  const tenant = await getCurrentTenant();
  const branding = getTenantBranding(tenant);

  const gradientCss = `linear-gradient(90deg, ${branding.gradient.from} 0%, ${branding.gradient.via} 50%, ${branding.gradient.to} 100%)`;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 flex shrink-0 flex-col border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
        <div className="h-1.5 w-full shrink-0" style={{ background: gradientCss }} />
        <div className="flex items-center px-5 py-4">
          <Link href="/dashboard" className="flex items-center gap-4">
            {branding.logoDataUrl && (
              <img src={branding.logoDataUrl} alt="" width={64} height={80} className="h-16 w-14 shrink-0 object-contain" />
            )}
            <div>
              <span
                style={{ fontFamily: "Helvetica, Arial, sans-serif" }}
                className="hidden text-3xl font-bold tracking-tight text-slate-900 sm:block"
              >
                {branding.name}
              </span>
              <span style={{ fontFamily: "Helvetica, Arial, sans-serif" }} className="block text-2xl font-bold tracking-tight text-slate-900 sm:hidden">
                {branding.shortName}
              </span>
              {branding.tagline && (
                <p style={{ fontFamily: "Helvetica, Arial, sans-serif" }} className="mt-0.5 text-sm text-slate-500">
                  {branding.tagline}
                </p>
              )}
              <div className="mt-2 h-0.5 w-10 rounded-full" style={{ background: branding.gradient.from }} />
            </div>
          </Link>
        </div>
        <div className="w-full py-2" style={{ background: branding.gradient.via }}>
          <nav className="flex items-center justify-center gap-8">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                style={{ fontFamily: "Helvetica, Arial, sans-serif" }}
                className="text-base font-bold text-white transition-opacity hover:opacity-80"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      <footer className="shrink-0 border-t border-slate-200 bg-slate-50 px-4 py-10 text-center">
        <a
          href="https://okiedokiepay.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2.5 text-slate-500 transition-colors hover:text-slate-900"
        >
          <Image src="/brand/okie-dokie-logo.png" alt="Okie Dokie" width={26} height={26} className="opacity-80" />
          <span className="text-base font-medium">Okie Dokie</span>
        </a>
        <p className="mt-3 text-xs text-slate-400">&copy; {new Date().getFullYear()} Okie Dokie. All rights reserved.</p>
      </footer>
    </div>
  );
}
