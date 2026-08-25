import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/jobs", label: "Jobs" },
  { href: "/applications", label: "Applications" },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 flex shrink-0 flex-col border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
        <div className="flex items-center justify-center gap-3 px-5 py-3">
          <Link href="/dashboard" className="flex items-center gap-3">
            <Image src="/brand/nbgsm-logo.png" alt="" width={44} height={56} className="shrink-0" />
            <span className="hidden text-2xl font-medium tracking-tight text-slate-900 sm:inline">
              Nirankari Baba Gurbachan Singh Memorial College
            </span>
            <span className="text-2xl font-medium tracking-tight text-slate-900 sm:hidden">NBGSM</span>
          </Link>
        </div>
        <div className="w-full py-2" style={{ background: "linear-gradient(90deg, #0f2359 0%, #1b449c 50%, #3465c9 100%)" }}>
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
      <footer className="flex shrink-0 items-center justify-center gap-2 border-t border-slate-200 bg-white px-4 py-3 text-xs text-slate-500">
        <span>Powered by</span>
        <Image src="/brand/okie-dokie-logo.png" alt="Okie Dokie" width={18} height={18} className="opacity-90" />
        <span className="font-semibold text-orange-700">Okie Dokie</span>
      </footer>
    </div>
  );
}
