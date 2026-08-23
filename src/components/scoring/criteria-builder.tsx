"use client";

import { useState } from "react";
import { deleteCriterion } from "@/lib/actions/scoring";
import { Button, Badge, EmptyState } from "@/components/ui/primitives";
import { SCORING_METHOD_LABELS, type ScoringMethod } from "@/lib/enums";
import { CriterionForm, type ExistingCriterionOption, type SourceFieldOption } from "./criterion-form";
import type { CriterionConfig } from "@/lib/scoring/types";

export interface CriterionRow {
  id: string;
  name: string;
  description: string | null;
  maxPoints: number;
  method: ScoringMethod;
  sourceFieldId: string | null;
  sourceFieldLabel: string | null;
  config: CriterionConfig;
}

export function CriteriaBuilder({
  patternId,
  versionId,
  criteria,
  sourceFields,
  editable,
}: {
  patternId: string;
  versionId: string;
  criteria: CriterionRow[];
  sourceFields: SourceFieldOption[];
  editable: boolean;
}) {
  const [mode, setMode] = useState<"none" | "add" | string>("none");

  const existingCriteria: ExistingCriterionOption[] = criteria.map((c) => ({
    id: c.id,
    name: c.name,
    maxPoints: c.maxPoints,
  }));

  const totalMaxPoints = criteria.reduce((sum, c) => sum + c.maxPoints, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {criteria.length} criteria · {totalMaxPoints} points allocated
        </p>
        {editable && mode === "none" && (
          <Button size="sm" onClick={() => setMode("add")}>
            + Add Criterion
          </Button>
        )}
      </div>

      {criteria.length === 0 && mode === "none" ? (
        <EmptyState
          title="No criteria yet"
          description={
            editable
              ? "This scoring pattern starts blank. Add the first criterion to begin."
              : "This version has no criteria."
          }
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2.5">Criterion</th>
                <th className="px-4 py-2.5">Method</th>
                <th className="px-4 py-2.5">Field</th>
                <th className="px-4 py-2.5 text-right">Max Points</th>
                {editable && <th className="px-4 py-2.5" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {criteria.map((c) =>
                mode === c.id ? (
                  <tr key={c.id}>
                    <td colSpan={editable ? 5 : 4} className="px-4 py-4">
                      <CriterionForm
                        patternId={patternId}
                        versionId={versionId}
                        sourceFields={sourceFields}
                        existingCriteria={existingCriteria}
                        initial={{
                          id: c.id,
                          name: c.name,
                          description: c.description,
                          maxPoints: c.maxPoints,
                          method: c.method,
                          sourceFieldId: c.sourceFieldId,
                          config: c.config,
                        }}
                        onDone={() => setMode("none")}
                      />
                      <button
                        type="button"
                        onClick={() => setMode("none")}
                        className="mt-2 text-xs text-slate-500 hover:underline"
                      >
                        Cancel
                      </button>
                    </td>
                  </tr>
                ) : (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{c.name}</p>
                      {c.description ? <p className="text-xs text-slate-500">{c.description}</p> : null}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone="blue">{SCORING_METHOD_LABELS[c.method]}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{c.sourceFieldLabel ?? "—"}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-800">{c.maxPoints}</td>
                    {editable && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-3">
                          <button
                            type="button"
                            onClick={() => setMode(c.id)}
                            className="text-xs font-medium text-orange-600 hover:underline"
                          >
                            Edit
                          </button>
                          <form action={deleteCriterion}>
                            <input type="hidden" name="criterionId" value={c.id} />
                            <input type="hidden" name="patternId" value={patternId} />
                            <button type="submit" className="text-xs font-medium text-red-600 hover:underline">
                              Delete
                            </button>
                          </form>
                        </div>
                      </td>
                    )}
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}

      {editable && mode === "add" && (
        <div>
          <CriterionForm
            patternId={patternId}
            versionId={versionId}
            sourceFields={sourceFields}
            existingCriteria={existingCriteria}
            onDone={() => setMode("none")}
          />
          <button type="button" onClick={() => setMode("none")} className="mt-2 text-xs text-slate-500 hover:underline">
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
