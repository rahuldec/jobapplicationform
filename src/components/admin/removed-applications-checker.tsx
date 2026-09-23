"use client";

import { useState } from "react";
import { Button } from "@/components/ui/primitives";
import { checkApplicationsRemovedFromSheet } from "@/lib/actions/tenants";
import { deleteApplicationsNotInSheet } from "@/lib/actions/applications";
import type { RemovedApplication } from "../../../prisma/sheet-import/sync";

// The review step for "a row was deleted from the Sheet, but the
// application stayed" — syncTenantSheet deliberately never removes
// anything on its own (see its file-level comment), so this is the
// explicit, human-reviewed way to actually clear those out. Nothing here
// runs automatically; every deletion is a specific person selecting
// specific rows and confirming.
export function RemovedApplicationsChecker({ tenantSlug }: { tenantSlug: string }) {
  const [checking, setChecking] = useState(false);
  const [checked, setChecked] = useState(false);
  const [unsupportedReason, setUnsupportedReason] = useState<string | null>(null);
  const [removed, setRemoved] = useState<RemovedApplication[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  const runCheck = async () => {
    setChecking(true);
    setError(null);
    setResultMessage(null);
    try {
      const result = await checkApplicationsRemovedFromSheet(tenantSlug);
      setChecked(true);
      if (!result.supported) {
        setUnsupportedReason(result.reason);
        setRemoved([]);
      } else {
        setUnsupportedReason(null);
        setRemoved(result.removed);
        setSelected(new Set());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't check the Sheet.");
    } finally {
      setChecking(false);
    }
  };

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const deleteSelected = async () => {
    if (selected.size === 0) return;
    const proceed = window.confirm(
      `Permanently delete ${selected.size} application${selected.size === 1 ? "" : "s"}? This also removes their documents and interview records. This cannot be undone.`,
    );
    if (!proceed) return;

    setDeleting(true);
    setError(null);
    try {
      const { count } = await deleteApplicationsNotInSheet(Array.from(selected));
      setRemoved((prev) => prev.filter((r) => !selected.has(r.id)));
      setSelected(new Set());
      setResultMessage(`Deleted ${count} application${count === 1 ? "" : "s"}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-900">Applications removed from the Sheet</p>
          <p className="mt-0.5 text-xs text-slate-500">
            Syncing never deletes anything on its own — this checks for applications whose row is no longer in the
            Sheet, so you can review and remove them yourself.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={runCheck} disabled={checking}>
          {checking ? "Checking…" : "Check now"}
        </Button>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {resultMessage && <p className="mt-3 text-sm text-emerald-600">{resultMessage}</p>}

      {checked && unsupportedReason && <p className="mt-3 text-sm text-slate-500">{unsupportedReason}</p>}

      {checked && !unsupportedReason && removed.length === 0 && (
        <p className="mt-3 text-sm text-slate-500">Every application here still has a matching row in the Sheet.</p>
      )}

      {checked && !unsupportedReason && removed.length > 0 && (
        <div className="mt-3 space-y-2">
          <div className="max-h-72 space-y-1 overflow-y-auto rounded-md border border-slate-200">
            {removed.map((app) => (
              <label key={app.id} className="flex items-center gap-2.5 border-b border-slate-100 px-3 py-2 text-sm last:border-b-0 hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={selected.has(app.id)}
                  onChange={() => toggle(app.id)}
                  className="h-3.5 w-3.5 shrink-0 rounded border-slate-300 text-red-600 focus:ring-red-500"
                />
                <span className="min-w-0 flex-1">
                  <span className="font-medium text-slate-900">{app.candidateName}</span>{" "}
                  <span className="text-slate-500">
                    ({app.applicationNumber} · {app.jobTitle})
                  </span>
                </span>
              </label>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">{selected.size} selected</span>
            <Button variant="danger" size="sm" onClick={deleteSelected} disabled={selected.size === 0 || deleting}>
              {deleting ? "Deleting…" : "Delete selected"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
