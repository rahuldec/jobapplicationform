import type { ConditionOperator } from "@/lib/enums";
import type { FieldValueContext } from "./types";

function toNumber(v: string | undefined): number {
  const n = Number(v);
  return Number.isNaN(n) ? 0 : n;
}

// Evaluates a single admin-authored IF condition against a field's current
// value. `field` may be undefined if the application never answered it —
// that is treated as empty, not as an error.
export function evaluateCondition(
  operator: ConditionOperator,
  field: FieldValueContext | undefined,
  value: string | undefined,
  valueTo: string | undefined,
): boolean {
  const text = field?.text ?? "";
  const number = field?.number;
  const isEmpty = text.trim().length === 0 && (number === null || number === undefined);

  switch (operator) {
    case "is_empty":
      return isEmpty;
    case "is_not_empty":
      return !isEmpty;
    case "contains":
      return text.toLowerCase().includes((value ?? "").toLowerCase());
    case "equals":
      if (number !== null && number !== undefined && value !== undefined && value !== "") {
        return number === toNumber(value);
      }
      return text.toLowerCase() === (value ?? "").toLowerCase();
    case "not_equals":
      if (number !== null && number !== undefined && value !== undefined && value !== "") {
        return number !== toNumber(value);
      }
      return text.toLowerCase() !== (value ?? "").toLowerCase();
    case "greater_than":
      return (number ?? 0) > toNumber(value);
    case "less_than":
      return (number ?? 0) < toNumber(value);
    case "greater_than_or_equal":
      return (number ?? 0) >= toNumber(value);
    case "less_than_or_equal":
      return (number ?? 0) <= toNumber(value);
    case "between":
      return (number ?? 0) >= toNumber(value) && (number ?? 0) <= toNumber(valueTo);
    default:
      return false;
  }
}
