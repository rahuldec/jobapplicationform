"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function HeroSearch({ tenantName: _ }: { tenantName: string }) {
  const [query, setQuery] = useState("");
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    router.push(`/applications?q=${encodeURIComponent(q)}`);
  }

  return (
    <div className="rounded-[24px] bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 px-6 py-8 text-center shadow-xl ring-1 ring-white/10">
      <h1 className="text-[26px] font-bold tracking-tight text-white sm:text-[30px]">
        Find any candidate
      </h1>

      <form onSubmit={handleSubmit} className="mx-auto mt-5 flex max-w-xl items-center gap-2">
        <div className="relative flex-1">
          <svg
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search candidates…"
            autoComplete="off"
            className="w-full rounded-2xl border-0 bg-white/10 py-3.5 pl-12 pr-4 text-[15px] text-white placeholder-slate-500 ring-1 ring-white/20 outline-none transition focus:bg-white/15 focus:ring-white/40"
          />
        </div>
        <button
          type="submit"
          className="shrink-0 rounded-2xl bg-orange-500 px-5 py-3.5 text-[15px] font-semibold text-white transition hover:bg-orange-600 active:scale-95"
        >
          Search
        </button>
      </form>
    </div>
  );
}
