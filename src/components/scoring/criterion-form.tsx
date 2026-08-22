"use client";

import { useMemo, useState } from "react";
import { saveCriterion } from "@/lib/actions/scoring";
import { Button, Field, inputClass } from "@/components/ui/primitives";
import {
  SCORING_METHODS,
  SCORING_METHOD_LABELS,
  SCORING_METHOD_DESCRIPTIONS,
  CONDITION_OPERATORS,
  CONDITION_OPERATOR_LABELS,
  type ScoringMethod,
} from "@/lib/enums";
import { defaultConfigForMethod, type CriterionConfig } from "@/lib/scoring/types";

export interface SourceFieldOption {
  id: string;
  fieldKey: string;
  label: string;
  formName: string;
  optionsJson: string | null;
}

export interface ExistingCriterionOption {
  id: string;
  name: string;
  maxPoints: number;
}

interface InitialCriterion {
  id: string;
  name: string;
  description: string | null;
  maxPoints: number;
  method: ScoringMethod;
  sourceFieldId: string | null;
  config: CriterionConfig;
}

export function CriterionForm({
  patternId,
  versionId,
  sourceFields,
  existingCriteria,
  initial,
  onDone,
}: {
  patternId: string;
  versionId: string;
  sourceFields: SourceFieldOption[];
  existingCriteria: ExistingCriterionOption[];
  initial?: InitialCriterion;
  onDone?: () => void;
}) {
  const [method, setMethod] = useState<ScoringMethod>(initial?.method ?? "fixed");
  const [config, setConfig] = useState<CriterionConfig>(initial?.config ?? defaultConfigForMethod("fixed"));
  const [sourceFieldId, setSourceFieldId] = useState(initial?.sourceFieldId ?? "");
  const [maxPoints, setMaxPoints] = useState(initial?.maxPoints ?? 10);

  const selectedField = useMemo(
    () => sourceFields.find((f) => f.id === sourceFieldId),
    [sourceFields, sourceFieldId],
  );
  const fieldOptions = useMemo(() => {
    if (!selectedField?.optionsJson) return [];
    try {
      return JSON.parse(selectedField.optionsJson) as { value: string; label: string }[];
    } catch {
      return [];
    }
  }, [selectedField]);

  function changeMethod(next: ScoringMethod) {
    setMethod(next);
    setConfig(defaultConfigForMethod(next));
  }

  const usesSourceField = ["fixed", "numeric_range", "percentage", "yes_no", "dropdown", "multiselect", "count"].includes(
    method,
  );

  return (
    <form
      action={saveCriterion}
      className="space-y-5 rounded-lg border border-slate-200 bg-slate-50/60 p-5"
      onSubmit={() => onDone?.()}
    >
      <input type="hidden" name="patternId" value={patternId} />
      <input type="hidden" name="versionId" value={versionId} />
      {initial ? <input type="hidden" name="criterionId" value={initial.id} /> : null}
      <input type="hidden" name="configJson" value={JSON.stringify(config)} />
      <input type="hidden" name="method" value={method} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[2fr_1fr]">
        <Field label="Criterion name" required>
          <input name="name" required defaultValue={initial?.name} className={inputClass} placeholder="e.g. Teaching Experience" />
        </Field>
        <Field label="Maximum points" required>
          <input
            name="maxPoints"
            type="number"
            min={0}
            step="0.01"
            required
            value={maxPoints}
            onChange={(e) => setMaxPoints(Number(e.target.value))}
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="Description" hint="Optional — shown to other admins reviewing this pattern.">
        <input name="description" defaultValue={initial?.description ?? ""} className={inputClass} />
      </Field>

      <Field label="Scoring method" required hint={SCORING_METHOD_DESCRIPTIONS[method]}>
        <select
          value={method}
          onChange={(e) => changeMethod(e.target.value as ScoringMethod)}
          className={inputClass}
        >
          {SCORING_METHODS.map((m) => (
            <option key={m} value={m}>
              {SCORING_METHOD_LABELS[m]}
            </option>
          ))}
        </select>
      </Field>

      {usesSourceField && (
        <Field label="Application field" required hint="The field this criterion reads from the candidate's application.">
          <select
            name="sourceFieldId"
            required
            value={sourceFieldId}
            onChange={(e) => setSourceFieldId(e.target.value)}
            className={inputClass}
          >
            <option value="">— Select a field —</option>
            {sourceFields.map((f) => (
              <option key={f.id} value={f.id}>
                {f.formName} · {f.label} ({f.fieldKey})
              </option>
            ))}
          </select>
        </Field>
      )}

      <MethodConfig
        method={method}
        config={config}
        onChange={setConfig}
        fieldOptions={fieldOptions}
        allFields={sourceFields}
        existingCriteria={existingCriteria.filter((c) => c.id !== initial?.id)}
      />

      <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
        <Button type="submit">{initial ? "Save Changes" : "Add Criterion"}</Button>
      </div>
    </form>
  );
}

function MethodConfig({
  method,
  config,
  onChange,
  fieldOptions,
  allFields,
  existingCriteria,
}: {
  method: ScoringMethod;
  config: CriterionConfig;
  onChange: (c: CriterionConfig) => void;
  fieldOptions: { value: string; label: string }[];
  allFields: SourceFieldOption[];
  existingCriteria: ExistingCriterionOption[];
}) {
  switch (method) {
    case "fixed":
      return (
        <p className="rounded-md bg-white px-3 py-2 text-sm text-slate-500 ring-1 ring-slate-200">
          Full points are awarded whenever the selected field has any value.
        </p>
      );

    case "numeric_range": {
      const c = config.method === "numeric_range" ? config : defaultConfigForMethod("numeric_range");
      if (c.method !== "numeric_range") return null;
      return (
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">Ranges</p>
          {c.ranges.map((r, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_1fr_1.5fr_auto] items-center gap-2">
              <input
                type="number"
                value={r.min}
                onChange={(e) =>
                  onChange({ ...c, ranges: c.ranges.map((x, j) => (j === i ? { ...x, min: Number(e.target.value) } : x)) })
                }
                className={inputClass}
                placeholder="Min"
              />
              <input
                type="number"
                value={r.max}
                onChange={(e) =>
                  onChange({ ...c, ranges: c.ranges.map((x, j) => (j === i ? { ...x, max: Number(e.target.value) } : x)) })
                }
                className={inputClass}
                placeholder="Max"
              />
              <input
                type="number"
                value={r.points}
                onChange={(e) =>
                  onChange({ ...c, ranges: c.ranges.map((x, j) => (j === i ? { ...x, points: Number(e.target.value) } : x)) })
                }
                className={inputClass}
                placeholder="Points"
              />
              <input
                type="text"
                value={r.label ?? ""}
                onChange={(e) =>
                  onChange({ ...c, ranges: c.ranges.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })
                }
                className={inputClass}
                placeholder="Label (optional)"
              />
              <button
                type="button"
                onClick={() => onChange({ ...c, ranges: c.ranges.filter((_, j) => j !== i) })}
                className="text-xs text-red-600 hover:underline"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => onChange({ ...c, ranges: [...c.ranges, { min: 0, max: 0, points: 0 }] })}
            className="text-xs font-medium text-indigo-600 hover:underline"
          >
            + Add range
          </button>
        </div>
      );
    }

    case "percentage": {
      const c = config.method === "percentage" ? config : defaultConfigForMethod("percentage");
      if (c.method !== "percentage") return null;
      return (
        <div className="grid grid-cols-2 gap-4">
          <Field label="Points per unit" hint="e.g. 0.4 points per percentage mark">
            <input
              type="number"
              step="0.01"
              value={c.pointsPerUnit}
              onChange={(e) => onChange({ ...c, pointsPerUnit: Number(e.target.value) })}
              className={inputClass}
            />
          </Field>
          <Field label="Cap (optional)">
            <input
              type="number"
              step="0.01"
              value={c.cap ?? ""}
              onChange={(e) => onChange({ ...c, cap: e.target.value ? Number(e.target.value) : undefined })}
              className={inputClass}
            />
          </Field>
        </div>
      );
    }

    case "yes_no": {
      const c = config.method === "yes_no" ? config : defaultConfigForMethod("yes_no");
      if (c.method !== "yes_no") return null;
      return (
        <div className="grid grid-cols-2 gap-4">
          <Field label="Points if Yes">
            <input
              type="number"
              step="0.01"
              value={c.yesPoints}
              onChange={(e) => onChange({ ...c, yesPoints: Number(e.target.value) })}
              className={inputClass}
            />
          </Field>
          <Field label="Points if No">
            <input
              type="number"
              step="0.01"
              value={c.noPoints}
              onChange={(e) => onChange({ ...c, noPoints: Number(e.target.value) })}
              className={inputClass}
            />
          </Field>
        </div>
      );
    }

    case "dropdown":
    case "multiselect": {
      const c =
        method === "dropdown"
          ? config.method === "dropdown"
            ? config
            : defaultConfigForMethod("dropdown")
          : config.method === "multiselect"
            ? config
            : defaultConfigForMethod("multiselect");
      if (c.method !== "dropdown" && c.method !== "multiselect") return null;

      const rows = fieldOptions.length > 0 ? fieldOptions.map((o) => o.value) : Object.keys(c.pointsMap);

      return (
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">Points per option</p>
          {(fieldOptions.length > 0 ? fieldOptions.map((o) => o.value) : rows).map((optionValue) => (
            <div key={optionValue} className="grid grid-cols-[2fr_1fr] items-center gap-2">
              <span className="text-sm text-slate-600">{optionValue}</span>
              <input
                type="number"
                step="0.01"
                value={c.pointsMap[optionValue] ?? 0}
                onChange={(e) =>
                  onChange({ ...c, pointsMap: { ...c.pointsMap, [optionValue]: Number(e.target.value) } })
                }
                className={inputClass}
              />
            </div>
          ))}
          {fieldOptions.length === 0 && (
            <p className="text-xs text-slate-500">
              Select a source field with dropdown/multi-select options to configure points per option.
            </p>
          )}
          {c.method === "dropdown" && (
            <Field label="Default points (no match)">
              <input
                type="number"
                step="0.01"
                value={c.defaultPoints}
                onChange={(e) => onChange({ ...c, defaultPoints: Number(e.target.value) })}
                className={inputClass}
              />
            </Field>
          )}
          {c.method === "multiselect" && (
            <Field label="Cap (optional)">
              <input
                type="number"
                step="0.01"
                value={c.cap ?? ""}
                onChange={(e) => onChange({ ...c, cap: e.target.value ? Number(e.target.value) : undefined })}
                className={inputClass}
              />
            </Field>
          )}
        </div>
      );
    }

    case "count": {
      const c = config.method === "count" ? config : defaultConfigForMethod("count");
      if (c.method !== "count") return null;
      return (
        <div className="grid grid-cols-2 gap-4">
          <Field label="Points per unit">
            <input
              type="number"
              step="0.01"
              value={c.pointsPerUnit}
              onChange={(e) => onChange({ ...c, pointsPerUnit: Number(e.target.value) })}
              className={inputClass}
            />
          </Field>
          <Field label="Cap (optional)">
            <input
              type="number"
              step="0.01"
              value={c.cap ?? ""}
              onChange={(e) => onChange({ ...c, cap: e.target.value ? Number(e.target.value) : undefined })}
              className={inputClass}
            />
          </Field>
        </div>
      );
    }

    case "formula": {
      const c = config.method === "formula" ? config : defaultConfigForMethod("formula");
      if (c.method !== "formula") return null;
      return (
        <div className="space-y-2">
          <Field
            label="Expression"
            hint="Reference fields like [field_key]. Supports + - × ÷ and parentheses."
          >
            <textarea
              value={c.expression}
              onChange={(e) => onChange({ ...c, expression: e.target.value })}
              rows={2}
              className={`${inputClass} font-mono`}
              placeholder="([post_graduation_percentage] × 0.4) + [teaching_experience_years]"
            />
          </Field>
          <div className="flex flex-wrap gap-1.5">
            {allFields.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => onChange({ ...c, expression: `${c.expression}[${f.fieldKey}]` })}
                className="rounded-md bg-white px-2 py-1 text-xs text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50"
              >
                + {f.fieldKey}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={c.clampToRange}
              onChange={(e) => onChange({ ...c, clampToRange: e.target.checked })}
            />
            Clamp result to 0 – max points
          </label>
        </div>
      );
    }

    case "conditional": {
      const c = config.method === "conditional" ? config : defaultConfigForMethod("conditional");
      if (c.method !== "conditional") return null;
      return (
        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-700">Rules (evaluated in order, first match wins)</p>
          {c.rules.map((rule, i) => (
            <div key={i} className="grid grid-cols-1 gap-2 rounded-md bg-white p-3 ring-1 ring-slate-200 sm:grid-cols-6">
              <select
                value={rule.fieldKey}
                onChange={(e) =>
                  onChange({ ...c, rules: c.rules.map((r, j) => (j === i ? { ...r, fieldKey: e.target.value } : r)) })
                }
                className={`${inputClass} sm:col-span-2`}
              >
                <option value="">Field…</option>
                {allFields.map((f) => (
                  <option key={f.id} value={f.fieldKey}>
                    {f.label}
                  </option>
                ))}
              </select>
              <select
                value={rule.operator}
                onChange={(e) =>
                  onChange({
                    ...c,
                    rules: c.rules.map((r, j) => (j === i ? { ...r, operator: e.target.value as typeof r.operator } : r)),
                  })
                }
                className={inputClass}
              >
                {CONDITION_OPERATORS.map((op) => (
                  <option key={op} value={op}>
                    {CONDITION_OPERATOR_LABELS[op]}
                  </option>
                ))}
              </select>
              <input
                value={rule.value ?? ""}
                onChange={(e) =>
                  onChange({ ...c, rules: c.rules.map((r, j) => (j === i ? { ...r, value: e.target.value } : r)) })
                }
                placeholder="Value"
                className={inputClass}
              />
              {rule.operator === "between" && (
                <input
                  value={rule.valueTo ?? ""}
                  onChange={(e) =>
                    onChange({ ...c, rules: c.rules.map((r, j) => (j === i ? { ...r, valueTo: e.target.value } : r)) })
                  }
                  placeholder="and…"
                  className={inputClass}
                />
              )}
              <input
                type="number"
                step="0.01"
                value={rule.thenPoints}
                onChange={(e) =>
                  onChange({
                    ...c,
                    rules: c.rules.map((r, j) => (j === i ? { ...r, thenPoints: Number(e.target.value) } : r)),
                  })
                }
                placeholder="Then points"
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => onChange({ ...c, rules: c.rules.filter((_, j) => j !== i) })}
                className="text-xs text-red-600 hover:underline"
              >
                Remove rule
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              onChange({
                ...c,
                rules: [...c.rules, { fieldKey: "", operator: "is_not_empty", thenPoints: 0 }],
              })
            }
            className="text-xs font-medium text-indigo-600 hover:underline"
          >
            + Add rule
          </button>
          <Field label="Else (no rule matched)">
            <input
              type="number"
              step="0.01"
              value={c.elsePoints}
              onChange={(e) => onChange({ ...c, elsePoints: Number(e.target.value) })}
              className={inputClass}
            />
          </Field>
        </div>
      );
    }

    case "weightage": {
      const c = config.method === "weightage" ? config : defaultConfigForMethod("weightage");
      if (c.method !== "weightage") return null;
      return (
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">
            Combine other criteria in this pattern by weight (weights are relative, not required to sum to 1)
          </p>
          {c.components.map((comp, i) => (
            <div key={i} className="grid grid-cols-[2fr_1fr_auto] items-center gap-2">
              <select
                value={comp.criterionId}
                onChange={(e) =>
                  onChange({
                    ...c,
                    components: c.components.map((x, j) => (j === i ? { ...x, criterionId: e.target.value } : x)),
                  })
                }
                className={inputClass}
              >
                <option value="">Select criterion…</option>
                {existingCriteria.map((cr) => (
                  <option key={cr.id} value={cr.id}>
                    {cr.name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                step="0.01"
                value={comp.weight}
                onChange={(e) =>
                  onChange({
                    ...c,
                    components: c.components.map((x, j) => (j === i ? { ...x, weight: Number(e.target.value) } : x)),
                  })
                }
                className={inputClass}
                placeholder="Weight"
              />
              <button
                type="button"
                onClick={() => onChange({ ...c, components: c.components.filter((_, j) => j !== i) })}
                className="text-xs text-red-600 hover:underline"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => onChange({ ...c, components: [...c.components, { criterionId: "", weight: 1 }] })}
            className="text-xs font-medium text-indigo-600 hover:underline"
          >
            + Add component
          </button>
          {existingCriteria.length === 0 && (
            <p className="text-xs text-amber-600">Add other criteria first, then combine them here.</p>
          )}
        </div>
      );
    }

    default:
      return null;
  }
}
