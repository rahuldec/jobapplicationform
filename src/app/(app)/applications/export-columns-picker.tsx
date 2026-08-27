"use client";

import { useState } from "react";
import { Button } from "@/components/ui/primitives";

export function ExportColumnsPicker({ baseHref, columns }: { baseHref: string; columns: string[] }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set(columns));

  const toggle = (col: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(col)) next.delete(col);
      else next.add(col);
      return next;
    });
  };

  const allSelected = selected.size === columns.length;
  const orderedSelected = columns.filter((c) => selected.has(c));
  const downloadHref = `${baseHref}${baseHref.includes("?") ? "&" : "?"}columns=${encodeURIComponent(orderedSelected.join(","))}`;

  return (
    <div className="relative">
      <Button variant="secondary" onClick={() => setOpen((v) => !v)}>
        Export to Excel
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-2 w-80 rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-slate-900">Choose columns</p>
              <button
                type="button"
                className="text-xs font-medium text-orange-600 hover:underline"
                onClick={() => setSelected(allSelected ? new Set() : new Set(columns))}
              >
                {allSelected ? "Deselect all" : "Select all"}
              </button>
            </div>
            <div className="max-h-64 space-y-0.5 overflow-y-auto pr-1">
              {columns.map((col) => (
                <label key={col} className="flex items-center gap-2 rounded px-1.5 py-1 text-sm text-slate-700 hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={selected.has(col)}
                    onChange={() => toggle(col)}
                    className="h-3.5 w-3.5 shrink-0 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                  />
                  <span className="truncate">{col}</span>
                </label>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
              <span className="text-xs text-slate-500">{selected.size} selected</span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                {selected.size > 0 ? (
                  <a href={downloadHref} onClick={() => setOpen(false)}>
                    <Button size="sm">Download</Button>
                  </a>
                ) : (
                  <Button size="sm" disabled>
                    Download
                  </Button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
