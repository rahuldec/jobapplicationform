// The scoring engine. This module receives:
//   1. An application's field values (data)
//   2. An admin's scoring pattern version (configuration)
// and produces a score breakdown. It contains no assumptions about what is
// being scored — "criterion" is a generic admin-authored rule, nothing here
// references qualifications/experience/interviews/publications by name.

import type { ScoringMethod } from "@/lib/enums";
import { evaluateCondition } from "./conditions";
import { evaluateFormula, FormulaError } from "./formula";
import type {
  ApplicationValueMap,
  ConditionalConfig,
  CountConfig,
  CriterionConfig,
  DropdownConfig,
  FixedConfig,
  FormulaConfig,
  MultiselectConfig,
  NumericRangeConfig,
  PercentageConfig,
  ScoreBreakdownEntry,
  ScoreResult,
  WeightageConfig,
  YesNoConfig,
} from "./types";

export interface CriterionInput {
  id: string;
  name: string;
  method: ScoringMethod;
  maxPoints: number;
  order: number;
  sourceFieldKey: string | null;
  config: CriterionConfig;
}

function clamp(value: number, max: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(Math.max(value, 0), max);
}

function evalFixed(_c: FixedConfig, field: ApplicationValueMap[string] | undefined, maxPoints: number) {
  const hasValue =
    field &&
    ((field.text && field.text.trim().length > 0) ||
      (field.number !== null && field.number !== undefined));
  const points = hasValue ? maxPoints : 0;
  return { points, detail: hasValue ? `Field has a value — awarded ${maxPoints}` : "Field is empty — awarded 0" };
}

function evalNumericRange(c: NumericRangeConfig, field: ApplicationValueMap[string] | undefined, maxPoints: number) {
  const value = field?.number ?? 0;
  const match = c.ranges.find((r) => value >= r.min && value <= r.max);
  if (!match) {
    return { points: 0, detail: `Value ${value} did not match any configured range — awarded 0` };
  }
  const points = clamp(match.points, maxPoints);
  const label = match.label ?? `${match.min}–${match.max}`;
  return { points, detail: `Value ${value} fell in range ${label} — awarded ${points}` };
}

function evalPercentage(c: PercentageConfig, field: ApplicationValueMap[string] | undefined, maxPoints: number) {
  const value = field?.number ?? 0;
  const raw = value * c.pointsPerUnit;
  const capped = c.cap !== undefined ? Math.min(raw, c.cap) : raw;
  const points = clamp(capped, maxPoints);
  return { points, detail: `${value} × ${c.pointsPerUnit} = ${raw.toFixed(2)}, awarded ${points}` };
}

function evalYesNo(c: YesNoConfig, field: ApplicationValueMap[string] | undefined, maxPoints: number) {
  const text = (field?.text ?? "").trim().toLowerCase();
  const isYes = text === "yes" || text === "true";
  const points = clamp(isYes ? c.yesPoints : c.noPoints, maxPoints);
  return { points, detail: `Answer "${field?.text ?? "(empty)"}" — awarded ${points}` };
}

function evalDropdown(c: DropdownConfig, field: ApplicationValueMap[string] | undefined, maxPoints: number) {
  const selected = field?.text ?? "";
  const mapped = c.pointsMap[selected];
  const points = clamp(mapped ?? c.defaultPoints, maxPoints);
  return { points, detail: `Selected "${selected || "(none)"}" — awarded ${points}` };
}

function evalMultiselect(c: MultiselectConfig, field: ApplicationValueMap[string] | undefined, maxPoints: number) {
  let selections: string[] = [];
  if (Array.isArray(field?.json)) {
    selections = field.json as string[];
  } else if (field?.text) {
    selections = field.text.split(",").map((s) => s.trim());
  }
  const raw = selections.reduce((sum, s) => sum + (c.pointsMap[s] ?? 0), 0);
  const capped = c.cap !== undefined ? Math.min(raw, c.cap) : raw;
  const points = clamp(capped, maxPoints);
  return { points, detail: `Selected [${selections.join(", ") || "none"}] — awarded ${points}` };
}

function evalCount(c: CountConfig, field: ApplicationValueMap[string] | undefined, maxPoints: number) {
  const count = field?.number ?? 0;
  const raw = count * c.pointsPerUnit;
  const capped = c.cap !== undefined ? Math.min(raw, c.cap) : raw;
  const points = clamp(capped, maxPoints);
  return { points, detail: `Count ${count} × ${c.pointsPerUnit} = ${raw.toFixed(2)}, awarded ${points}` };
}

function evalFormula(c: FormulaConfig, values: ApplicationValueMap, maxPoints: number) {
  try {
    const raw = evaluateFormula(c.expression, values);
    const points = c.clampToRange ? clamp(raw, maxPoints) : raw;
    return { points, detail: `${c.expression} = ${raw.toFixed(2)}, awarded ${points}` };
  } catch (err) {
    const message = err instanceof FormulaError ? err.message : "Formula evaluation failed";
    return { points: 0, detail: `Error: ${message}` };
  }
}

function evalConditional(c: ConditionalConfig, values: ApplicationValueMap, maxPoints: number) {
  for (const rule of c.rules) {
    const field = values[rule.fieldKey];
    if (evaluateCondition(rule.operator, field, rule.value, rule.valueTo)) {
      const points = clamp(rule.thenPoints, maxPoints);
      return { points, detail: `Matched rule on "${rule.fieldKey}" (${rule.operator}) — awarded ${points}` };
    }
  }
  const points = clamp(c.elsePoints, maxPoints);
  return { points, detail: `No rule matched — awarded default ${points}` };
}

function evalWeightage(
  c: WeightageConfig,
  computed: Map<string, ScoreBreakdownEntry>,
  maxPoints: number,
) {
  let ratioSum = 0;
  let weightSum = 0;
  const parts: string[] = [];
  for (const comp of c.components) {
    const source = computed.get(comp.criterionId);
    if (!source) {
      return {
        points: 0,
        detail: `Referenced criterion ${comp.criterionId} has not been calculated yet — check criteria order`,
      };
    }
    const ratio = source.maxPoints > 0 ? source.points / source.maxPoints : 0;
    ratioSum += ratio * comp.weight;
    weightSum += comp.weight;
    parts.push(`${source.name} (${(ratio * 100).toFixed(0)}% × ${comp.weight})`);
  }
  const blended = weightSum > 0 ? ratioSum / weightSum : 0;
  const points = clamp(blended * maxPoints, maxPoints);
  return { points, detail: `${parts.join(" + ")} = ${points.toFixed(2)}` };
}

export function calculateScore(
  criteria: CriterionInput[],
  values: ApplicationValueMap,
  maxScore: number | null,
): ScoreResult {
  const ordered = [...criteria].sort((a, b) => a.order - b.order);
  const computed = new Map<string, ScoreBreakdownEntry>();
  const breakdown: ScoreBreakdownEntry[] = [];

  for (const criterion of ordered) {
    const field = criterion.sourceFieldKey ? values[criterion.sourceFieldKey] : undefined;
    let result: { points: number; detail: string };

    switch (criterion.config.method) {
      case "fixed":
        result = evalFixed(criterion.config, field, criterion.maxPoints);
        break;
      case "numeric_range":
        result = evalNumericRange(criterion.config, field, criterion.maxPoints);
        break;
      case "percentage":
        result = evalPercentage(criterion.config, field, criterion.maxPoints);
        break;
      case "yes_no":
        result = evalYesNo(criterion.config, field, criterion.maxPoints);
        break;
      case "dropdown":
        result = evalDropdown(criterion.config, field, criterion.maxPoints);
        break;
      case "multiselect":
        result = evalMultiselect(criterion.config, field, criterion.maxPoints);
        break;
      case "count":
        result = evalCount(criterion.config, field, criterion.maxPoints);
        break;
      case "formula":
        result = evalFormula(criterion.config, values, criterion.maxPoints);
        break;
      case "conditional":
        result = evalConditional(criterion.config, values, criterion.maxPoints);
        break;
      case "weightage":
        result = evalWeightage(criterion.config, computed, criterion.maxPoints);
        break;
    }

    const entry: ScoreBreakdownEntry = {
      criterionId: criterion.id,
      name: criterion.name,
      method: criterion.method,
      points: Math.round(result.points * 100) / 100,
      maxPoints: criterion.maxPoints,
      detail: result.detail,
    };
    computed.set(criterion.id, entry);
    breakdown.push(entry);
  }

  const totalScore = Math.round(breakdown.reduce((sum, b) => sum + b.points, 0) * 100) / 100;

  return { totalScore, maxScore, breakdown };
}
