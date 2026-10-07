"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function HeroSearch({ tenantName }: { tenantName: string }) {
  const [query, setQuery] = useState("");
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    router.push(`/applications?q=${encodeURIComponent(q)}`);
  }

  return (
    <div className="py-4 text-center">
      <h1 className="text-[20px] font-bold tracking-tight text-slate-900">
        Find any candidate
      </h1>

      <form onSubmit={handleSubmit} className="mx-auto mt-3 flex max-w-lg items-center gap-2">
        <div className="relative flex-1">
          <svg
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search candidates…"
            autoComplete="off"
            className="w-full rounded-xl border-0 bg-white py-2.5 pl-10 pr-4 text-[14px] text-slate-900 placeholder-slate-400 ring-1 ring-slate-200 outline-none transition focus:ring-2 focus:ring-orange-400"
          />
        </div>
        <button
          type="submit"
          className="shrink-0 rounded-xl bg-orange-500 px-4 py-2.5 text-[14px] font-semibold text-white transition hover:bg-orange-600 active:scale-95"
        >
          Search
        </button>
      </form>
    </div>
  );
}
