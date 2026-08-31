"use client";

import { useState } from "react";
import { Button } from "@/components/ui/primitives";
import { updateSynopsisConfig } from "@/lib/actions/tenants";
import {
  CANDIDATE_FIELD_OPTIONS,
  APPLICATION_FIELD_OPTIONS,
  CANDIDATE_DETAILS_BLOCK,
  APPLICATION_DETAILS_BLOCK,
  DECLARATION_BLOCK,
  isFormSectionBlock,
  formSectionIdFromBlock,
  resolveBlockOrder,
  type SynopsisConfig,
} from "@/lib/synopsis-config";

export function SynopsisConfigBuilder({
  tenantId,
  initialConfig,
  sections,
}: {
  tenantId: string;
  initialConfig: SynopsisConfig;
  sections: { id: string; name: string }[];
}) {
  const sectionIds = sections.map((s) => s.id);
  const sectionNameById = new Map(sections.map((s) => [s.id, s.name]));

  const [excludedCandidateFields, setExcludedCandidateFields] = useState<string[]>(initialConfig.excludedCandidateFields);
  const [excludedApplicationFields, setExcludedApplicationFields] = useState<string[]>(initialConfig.excludedApplicationFields);
  const [excludedFormSectionIds, setExcludedFormSectionIds] = useState<string[]>(initialConfig.excludedFormSectionIds);
  const [hideDeclaration, setHideDeclaration] = useState(initialConfig.hideDeclaration);
  const [blockOrder, setBlockOrder] = useState<string[]>(() => resolveBlockOrder(initialConfig.blockOrder, sectionIds));
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggleInList = (list: string[], setList: (v: string[]) => void, key: string) => {
    setList(list.includes(key) ? list.filter((k) => k !== key) : [...list, key]);
  };

  const moveBlock = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= blockOrder.length) return;
    const next = [...blockOrder];
    [next[index], next[target]] = [next[target], next[index]];
    setBlockOrder(next);
  };

  const blockLabel = (blockId: string) => {
    if (blockId === CANDIDATE_DETAILS_BLOCK) return "Candidate Details";
    if (blockId === APPLICATION_DETAILS_BLOCK) return "Application Details";
    if (blockId === DECLARATION_BLOCK) return "Declaration & signature block";
    return sectionNameById.get(formSectionIdFromBlock(blockId)) ?? "(removed section)";
  };

  const handleSave = async () => {
    setError(null);
    setSaving(true);
    try {
      const config: SynopsisConfig = {
        excludedCandidateFields,
        excludedApplicationFields,
        hideDeclaration,
        excludedFormSectionIds,
        blockOrder,
      };
      await updateSynopsisConfig({ tenantId, config });
      setSavedAt(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 px-5 py-5">
      {blockOrder.map((blockId, index) => (
        <div key={blockId} className="flex items-start gap-3 rounded-lg border border-slate-200 px-4 py-3">
          <div className="flex shrink-0 flex-col gap-1 pt-0.5">
            <button
              type="button"
              onClick={() => moveBlock(index, -1)}
              disabled={index === 0}
              aria-label={`Move ${blockLabel(blockId)} up`}
              className="flex h-5 w-5 items-center justify-center rounded border border-slate-300 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent"
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => moveBlock(index, 1)}
              disabled={index === blockOrder.length - 1}
              aria-label={`Move ${blockLabel(blockId)} down`}
              className="flex h-5 w-5 items-center justify-center rounded border border-slate-300 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent"
            >
              ↓
            </button>
          </div>

          <div className="flex-1">
            <p className="text-sm font-medium text-slate-800">{blockLabel(blockId)}</p>

            {blockId === CANDIDATE_DETAILS_BLOCK && (
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {CANDIDATE_FIELD_OPTIONS.map((f) => (
                  <label key={f.key} className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={!excludedCandidateFields.includes(f.key)}
                      onChange={() => toggleInList(excludedCandidateFields, setExcludedCandidateFields, f.key)}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                    />
                    {f.label}
                  </label>
                ))}
              </div>
            )}

            {blockId === APPLICATION_DETAILS_BLOCK && (
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {APPLICATION_FIELD_OPTIONS.map((f) => (
                  <label key={f.key} className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={!excludedApplicationFields.includes(f.key)}
                      onChange={() => toggleInList(excludedApplicationFields, setExcludedApplicationFields, f.key)}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                    />
                    {f.label}
                  </label>
                ))}
              </div>
            )}

            {blockId === DECLARATION_BLOCK && (
              <label className="mt-2 flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={!hideDeclaration}
                  onChange={() => setHideDeclaration((v) => !v)}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                />
                Include this block
              </label>
            )}

            {isFormSectionBlock(blockId) && (
              <label className="mt-2 flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={!excludedFormSectionIds.includes(formSectionIdFromBlock(blockId))}
                  onChange={() => toggleInList(excludedFormSectionIds, setExcludedFormSectionIds, formSectionIdFromBlock(blockId))}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                />
                Include this section
              </label>
            )}
          </div>
        </div>
      ))}

      <div className="flex items-center gap-3 border-t border-slate-100 pt-4">
        <Button type="button" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
        {error ? <span className="text-sm text-red-600">{error}</span> : null}
        {!error && savedAt ? <span className="text-sm text-emerald-600">Saved.</span> : null}
      </div>
    </div>
  );
}
