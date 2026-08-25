"use client";

import { useState } from "react";
import Link from "next/link";
import { StatusBadge, Button } from "@/components/ui/primitives";
import { APPLICATION_STATUS_LABELS } from "@/lib/enums";

export type ApplicationRow = {
  id: string;
  applicationNumber: string;
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  status: string;
  scoreLabel: string;
  appliedLabel: string;
};

export function ApplicationsTable({ rows }: { rows: ApplicationRow[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allSelected = rows.length > 0 && selected.size === rows.length;
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)));

  return (
    <>
      {selected.size > 0 && (
        <div className="flex items-center justify-between border-b border-orange-100 bg-orange-50 px-4 py-2.5">
          <span className="text-sm font-medium text-orange-800">{selected.size} selected</span>
          <a href={`/api/export/synopsis?ids=${Array.from(selected).join(",")}`}>
            <Button variant="secondary" size="sm">
              Download Synopsis ({selected.size})
            </Button>
          </a>
        </div>
      )}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <th className="w-9 px-4 py-2.5">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                aria-label="Select all applications on this page"
                className="h-3.5 w-3.5 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
              />
            </th>
            <th className="px-4 py-2.5">Application #</th>
            <th className="px-4 py-2.5">Candidate</th>
            <th className="px-4 py-2.5">Job</th>
            <th className="px-4 py-2.5">Status</th>
            <th className="px-4 py-2.5">Score</th>
            <th className="px-4 py-2.5">Applied</th>
            <th className="px-4 py-2.5"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((app) => (
            <tr key={app.id} className="hover:bg-slate-50">
              <td className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={selected.has(app.id)}
                  onChange={() => toggle(app.id)}
                  aria-label={`Select ${app.applicationNumber}`}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                />
              </td>
              <td className="px-4 py-3">
                <Link href={`/applications/${app.id}`} className="font-medium text-orange-600 hover:underline">
                  {app.applicationNumber}
                </Link>
              </td>
              <td className="px-4 py-3 text-slate-700">
                {app.candidateName}
                <p className="text-xs text-slate-400">{app.candidateEmail}</p>
              </td>
              <td className="px-4 py-3 text-slate-600">{app.jobTitle}</td>
              <td className="px-4 py-3">
                <StatusBadge status={app.status} label={APPLICATION_STATUS_LABELS[app.status as keyof typeof APPLICATION_STATUS_LABELS] ?? app.status} />
              </td>
              <td className="px-4 py-3 tabular-nums text-slate-700">{app.scoreLabel}</td>
              <td className="px-4 py-3 text-slate-500">{app.appliedLabel}</td>
              <td className="px-4 py-3 text-right">
                <a href={`/api/applications/${app.id}/synopsis`} className="text-xs font-medium text-orange-600 hover:underline">
                  Synopsis
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
