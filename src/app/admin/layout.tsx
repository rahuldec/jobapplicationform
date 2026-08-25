import Link from "next/link";
import type { ReactNode } from "react";

// Deliberately outside the (app) route group: this area manages every
// client, so it must never render with one specific client's branding
// (logo/colors), which depends on whichever tenant happens to be active
// in the current browser's cookie — see src/lib/tenant.ts.
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      <header className="sticky top-0 z-10 flex shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900 px-5 py-3">
        <Link href="/admin" className="text-sm font-semibold tracking-wide text-white">
          Recruitment Ops Portal — Admin
        </Link>
        <span className="text-xs text-slate-400">Manages every client on this deployment</span>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
