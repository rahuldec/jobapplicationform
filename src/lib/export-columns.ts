// Per-tenant custom setup for the Applications page's "Export to Excel" —
// see Tenant.exportColumnsJson in prisma/schema.prisma. `column` is one of
// the internal column keys the export route already produces (e.g.
// "Application #", a dynamic field's own label, or "Document: X") —
// exactly the same strings offered in the "Select Table Head" dropdown.
export type ExportColumnRule = {
  column: string;
  displayName: string;
  sequence: number;
};

export function parseExportColumnsMapping(json: string | null): ExportColumnRule[] | null {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return null;
    const rules = parsed.filter(
      (r): r is ExportColumnRule =>
        r && typeof r.column === "string" && typeof r.displayName === "string" && typeof r.sequence === "number",
    );
    return rules.length ? rules : null;
  } catch {
    // Malformed config shouldn't break the export — fall back to the default.
    return null;
  }
}

// Applies a saved mapping to one already-built export row: keeps only the
// mapped columns, renamed to their display name, ordered by sequence.
export function applyExportColumnsMapping(
  row: Record<string, string | number>,
  rules: ExportColumnRule[],
): Record<string, string | number> {
  const ordered = [...rules].sort((a, b) => a.sequence - b.sequence);
  const result: Record<string, string | number> = {};
  for (const rule of ordered) {
    if (rule.column in row) result[rule.displayName || rule.column] = row[rule.column];
  }
  return result;
}
