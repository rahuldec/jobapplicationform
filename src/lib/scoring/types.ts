import { z } from "zod";
import type { ConditionOperator, ScoringMethod } from "@/lib/enums";
import { CONDITION_OPERATORS } from "@/lib/enums";

// Config shapes for each scoring method's configJson. These are entirely
// admin-authored through the pattern builder UI — nothing here encodes a
// college-specific meaning (no "qualification"/"experience" assumptions).

export const fixedConfigSchema = z.object({
  method: z.literal("fixed"),
});
export type FixedConfig = z.infer<typeof fixedConfigSchema>;

export const numericRangeConfigSchema = z.object({
  method: z.literal("numeric_range"),
  ranges: z
    .array(
      z.object({
        min: z.number(),
        max: z.number(),
        points: z.number(),
        label: z.string().optional(),
      }),
    )
    .min(1),
});
export type NumericRangeConfig = z.infer<typeof numericRangeConfigSchema>;

export const percentageConfigSchema = z.object({
  method: z.literal("percentage"),
  pointsPerUnit: z.number(),
  cap: z.number().optional(),
});
export type PercentageConfig = z.infer<typeof percentageConfigSchema>;

export const yesNoConfigSchema = z.object({
  method: z.literal("yes_no"),
  yesPoints: z.number(),
  noPoints: z.number(),
});
export type YesNoConfig = z.infer<typeof yesNoConfigSchema>;

export const dropdownConfigSchema = z.object({
  method: z.literal("dropdown"),
  pointsMap: z.record(z.string(), z.number()),
  defaultPoints: z.number().default(0),
});
export type DropdownConfig = z.infer<typeof dropdownConfigSchema>;

export const multiselectConfigSchema = z.object({
  method: z.literal("multiselect"),
  pointsMap: z.record(z.string(), z.number()),
  cap: z.number().optional(),
});
export type MultiselectConfig = z.infer<typeof multiselectConfigSchema>;

export const countConfigSchema = z.object({
  method: z.literal("count"),
  pointsPerUnit: z.number(),
  cap: z.number().optional(),
});
export type CountConfig = z.infer<typeof countConfigSchema>;

export const formulaConfigSchema = z.object({
  method: z.literal("formula"),
  expression: z.string().min(1),
  clampToRange: z.boolean().default(true),
});
export type FormulaConfig = z.infer<typeof formulaConfigSchema>;

export const conditionRuleSchema = z.object({
  fieldKey: z.string().min(1),
  operator: z.enum(
    CONDITION_OPERATORS as unknown as [ConditionOperator, ...ConditionOperator[]],
  ),
  value: z.string().optional(),
  valueTo: z.string().optional(),
  thenPoints: z.number(),
});
export type ConditionRule = z.infer<typeof conditionRuleSchema>;

export const conditionalConfigSchema = z.object({
  method: z.literal("conditional"),
  rules: z.array(conditionRuleSchema).min(1),
  elsePoints: z.number().default(0),
});
export type ConditionalConfig = z.infer<typeof conditionalConfigSchema>;

export const weightageComponentSchema = z.object({
  criterionId: z.string().min(1),
  weight: z.number(),
});

export const weightageConfigSchema = z.object({
  method: z.literal("weightage"),
  components: z.array(weightageComponentSchema).min(1),
});
export type WeightageConfig = z.infer<typeof weightageConfigSchema>;

export const criterionConfigSchema = z.discriminatedUnion("method", [
  fixedConfigSchema,
  numericRangeConfigSchema,
  percentageConfigSchema,
  yesNoConfigSchema,
  dropdownConfigSchema,
  multiselectConfigSchema,
  countConfigSchema,
  formulaConfigSchema,
  conditionalConfigSchema,
  weightageConfigSchema,
]);
export type CriterionConfig = z.infer<typeof criterionConfigSchema>;

export function defaultConfigForMethod(method: ScoringMethod): CriterionConfig {
  switch (method) {
    case "fixed":
      return { method: "fixed" };
    case "numeric_range":
      return { method: "numeric_range", ranges: [{ min: 0, max: 0, points: 0 }] };
    case "percentage":
      return { method: "percentage", pointsPerUnit: 0 };
    case "yes_no":
      return { method: "yes_no", yesPoints: 0, noPoints: 0 };
    case "dropdown":
      return { method: "dropdown", pointsMap: {}, defaultPoints: 0 };
    case "multiselect":
      return { method: "multiselect", pointsMap: {} };
    case "count":
      return { method: "count", pointsPerUnit: 0 };
    case "formula":
      return { method: "formula", expression: "", clampToRange: true };
    case "conditional":
      return {
        method: "conditional",
        rules: [
          {
            fieldKey: "",
            operator: "is_not_empty",
            thenPoints: 0,
          },
        ],
        elsePoints: 0,
      };
    case "weightage":
      return { method: "weightage", components: [] };
  }
}

export interface FieldValueContext {
  text: string | null;
  number: number | null;
  json: unknown;
}

export type ApplicationValueMap = Record<string, FieldValueContext>;

export interface ScoreBreakdownEntry {
  criterionId: string;
  name: string;
  method: ScoringMethod;
  points: number;
  maxPoints: number;
  detail: string;
}

export interface ScoreResult {
  totalScore: number;
  maxScore: number | null;
  breakdown: ScoreBreakdownEntry[];
}
