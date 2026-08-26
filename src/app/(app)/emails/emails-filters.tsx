"use client";

import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { inputClass } from "@/components/ui/primitives";

const SEARCH_DEBOUNCE_MS = 400;

export function EmailsFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const status = searchParams.get("status") ?? "";
  const hasFilters = Boolean(searchParams.get("q") || status);

  function navigate(overrides: Record<string, string | undefined>) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(overrides)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    next.delete("page");
    router.replace(next.toString() ? `${pathname}?${next.toString()}` : pathname);
  }

  function onSearchChange(value: string) {
    setQ(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => navigate({ q: value || undefined }), SEARCH_DEBOUNCE_MS);
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-[240px] flex-1">
        <label className="block text-xs font-medium text-slate-600">Search</label>
        <input
          value={q}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Candidate, email, application #, or subject"
          className={`${inputClass} mt-1`}
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600">Status</label>
        <select value={status} onChange={(e) => navigate({ status: e.target.value || undefined })} className={`${inputClass} mt-1`}>
          <option value="">All</option>
          <option value="sent">Sent</option>
          <option value="failed">Failed</option>
        </select>
      </div>
      {hasFilters && (
        <Link href={pathname} className="text-xs text-slate-500 hover:underline">
          Clear
        </Link>
      )}
    </div>
  );
}
