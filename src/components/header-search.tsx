"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function HeaderSearch() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    router.push(`/applications?q=${encodeURIComponent(q)}`);
  }

  return (
    <form onSubmit={handleSubmit} className="relative hidden sm:block">
      <svg
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z" />
      </svg>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search candidate, app no…"
        className="w-64 rounded-xl bg-slate-100 py-2 pl-9 pr-4 text-[13px] text-slate-900 placeholder-slate-400 outline-none ring-1 ring-transparent transition focus:bg-white focus:ring-slate-300"
      />
    </form>
  );
}
