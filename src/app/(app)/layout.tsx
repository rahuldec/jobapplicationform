import Link from "next/link";
import type { ReactNode } from "react";
import { getCurrentTenant, listTenants } from "@/lib/tenant";
import { TenantSwitcher } from "@/components/tenant-switcher";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/jobs", label: "Jobs" },
  { href: "/applications", label: "Applications" },
  { href: "/scoring", label: "Scoring" },
];

export default async function AppLayout({ children }: { children: ReactNode }) {
  const [tenant, tenants] = await Promise.all([getCurrentTenant(), listTenants()]);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900 px-4">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-sm font-semibold tracking-tight text-white">
            Recruitment Ops
          </Link>
          <nav className="flex items-center gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-slate-400 sm:inline">Viewing as</span>
          <TenantSwitcher tenants={tenants} currentTenantId={tenant.id} />
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
