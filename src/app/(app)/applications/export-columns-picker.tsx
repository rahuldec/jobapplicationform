"use client";

import { useState } from "react";
import { Button } from "@/components/ui/primitives";
import { updateExportColumnsMapping } from "@/lib/actions/applications";
import type { ExportColumnRule } from "@/lib/export-columns";

function defaultRules(columns: string[]): ExportColumnRule[] {
  return columns.map((column, i) => ({ column, displayName: column, sequence: i + 1 }));
}

export function ExportColumnsPicker({
  baseHref,
  columns,
  tenantId,
  initialMapping,
}: {
  baseHref: string;
  columns: string[];
  tenantId: string;
  initialMapping: ExportColumnRule[] | null;
}) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ExportColumnRule[]>(initialMapping ?? defaultRules(columns));
  const [saving, setSaving] = useState(false);

  const updateRow = (index: number, patch: Partial<ExportColumnRule>) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };
  const removeRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };
  const addRow = () => {
    const unused = columns.find((c) => !rows.some((r) => r.column === c)) ?? columns[0];
    const nextSequence = rows.length ? Math.max(...rows.map((r) => r.sequence)) + 1 : 1;
    setRows((prev) => [...prev, { column: unused, displayName: unused, sequence: nextSequence }]);
  };
  const resetToDefault = () => setRows(defaultRules(columns));

  const saveMapping = async () => {
    setSaving(true);
    try {
      await updateExportColumnsMapping({ tenantId, rules: rows });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndDownload = async () => {
    await saveMapping();
    window.location.href = baseHref;
    setOpen(false);
  };

  return (
    <div className="relative">
      <Button variant="secondary" onClick={() => setOpen((v) => !v)}>
        Export to Excel
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-2 w-[600px] max-w-[90vw] rounded-lg border border-slate-200 bg-white p-4 shadow-lg">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-900">Export columns</p>
                <p className="text-xs text-slate-500">Choose which columns to export, what to call them, and their order.</p>
              </div>
              <button type="button" className="text-xs font-medium text-orange-600 hover:underline" onClick={resetToDefault}>
                Reset to default
              </button>
            </div>

            <div className="grid grid-cols-[1fr_1fr_90px_28px] gap-x-3 gap-y-1 px-0.5 text-xs font-medium text-slate-500">
              <span>Select Table Head</span>
              <span>Enter Table Head Name</span>
              <span>Sequence No</span>
              <span />
            </div>

            <div className="max-h-80 space-y-1.5 overflow-y-auto py-1.5 pr-1">
              {rows.map((row, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_90px_28px] items-center gap-x-3">
                  <select
                    value={row.column}
                    onChange={(e) => updateRow(i, { column: e.target.value })}
                    className="w-full truncate rounded-md border-0 py-1.5 pl-2 pr-6 text-xs text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-orange-500"
                  >
                    {columns.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <input
                    value={row.displayName}
                    onChange={(e) => updateRow(i, { displayName: e.target.value })}
                    placeholder="Enter Table Head Name"
                    className="w-full rounded-md border-0 px-2 py-1.5 text-xs text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-orange-500"
                  />
                  <input
                    type="number"
                    value={row.sequence}
                    onChange={(e) => updateRow(i, { sequence: Number(e.target.value) || 0 })}
                    className="w-full rounded-md border-0 px-2 py-1.5 text-xs text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-orange-500"
                  />
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-red-50 hover:text-red-600"
                    aria-label="Remove column"
                  >
                    ×
                  </button>
                </div>
              ))}
              {rows.length === 0 && <p className="py-3 text-center text-xs text-slate-400">No columns configured — add one below.</p>}
            </div>

            <button type="button" onClick={addRow} className="mt-1 text-xs font-medium text-orange-600 hover:underline">
              + Add column
            </button>

            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
              <span className="text-xs text-slate-500">{rows.length} column{rows.length === 1 ? "" : "s"}</span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button variant="secondary" size="sm" onClick={saveMapping} disabled={saving}>
                  {saving ? "Saving…" : "Save"}
                </Button>
                <Button size="sm" onClick={handleSaveAndDownload} disabled={saving || rows.length === 0}>
                  Save &amp; Download
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
