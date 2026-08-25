"use client";

import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { inputClass, Button } from "@/components/ui/primitives";
import { APPLICATION_STATUS_LABELS, VISIBLE_APPLICATION_STATUSES } from "@/lib/enums";

const PAGE_SIZE_OPTIONS = [20, 50, 100] as const;
const SEARCH_DEBOUNCE_MS = 400;

export function ApplicationsFilters({ jobs, documentTypes }: { jobs: { id: string; title: string }[]; documentTypes: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const status = searchParams.get("status") ?? "";
  const jobId = searchParams.get("jobId") ?? "";
  const documentType = searchParams.get("documentType") ?? "";
  const pageSize = searchParams.get("pageSize") ?? "20";
  const hasFilters = Boolean(
    searchParams.get("q") || status || jobId || documentType || searchParams.get("since") || searchParams.get("pageSize"),
  );

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

  // Downloads every matching application's documents of this one type in
  // a single ZIP — no 20-item cap, since it goes through the filter-based
  // export path (not the checkbox-selection `ids` path), so it can cover
  // the full dataset. Carries the same filters the table is showing
  // (search/status/job), just not pagination.
  function downloadTypeHref() {
    const next = new URLSearchParams();
    for (const key of ["q", "status", "jobId", "since"]) {
      const v = searchParams.get(key);
      if (v) next.set(key, v);
    }
    next.set("documentType", documentType);
    next.set("groupBy", "type");
    return `/api/export/documents?${next.toString()}`;
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-[220px] flex-1">
        <label className="block text-xs font-medium text-slate-600">Search</label>
        <input
          value={q}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Name, application #, email, mobile"
          className={`${inputClass} mt-1`}
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600">Status</label>
        <select value={status} onChange={(e) => navigate({ status: e.target.value || undefined })} className={`${inputClass} mt-1`}>
          <option value="">All</option>
          {VISIBLE_APPLICATION_STATUSES.map((s) => (
            <option key={s} value={s}>
              {APPLICATION_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600">Job</label>
        <select value={jobId} onChange={(e) => navigate({ jobId: e.target.value || undefined })} className={`${inputClass} mt-1`}>
          <option value="">All jobs</option>
          {jobs.map((j) => (
            <option key={j.id} value={j.id}>
              {j.title}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600">Per page</label>
        <select value={pageSize} onChange={(e) => navigate({ pageSize: e.target.value })} className={`${inputClass} mt-1`}>
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </div>
      <div className="min-w-[200px]">
        <label className="block text-xs font-medium text-slate-600">Document type</label>
        <select
          value={documentType}
          onChange={(e) => navigate({ documentType: e.target.value || undefined })}
          className={`${inputClass} mt-1`}
        >
          <option value="">Select a type to download…</option>
          {documentTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
      {documentType && (
        <a href={downloadTypeHref()}>
          <Button variant="secondary">Download all &quot;{documentType}&quot;</Button>
        </a>
      )}
      {hasFilters && (
        <Link href={pathname} className="text-xs text-slate-500 hover:underline">
          Clear
        </Link>
      )}
    </div>
  );
}
