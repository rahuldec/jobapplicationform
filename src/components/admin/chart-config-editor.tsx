"use client";

import { useState, useTransition } from "react";
import { updateChartMappings } from "@/lib/actions/tenants";
import type { ChartMapping, SectionSpec } from "../../../prisma/sheet-import/types";
import { Button } from "@/components/ui/primitives";

type FieldOption = { fieldKey: string; label: string; section: string };

// Synthetic option that groups by job title, not a form field value
const JOB_OPTION: FieldOption = { fieldKey: "__job__", label: "Applications by job", section: "Built-in" };

function buildFieldOptions(sections: SectionSpec[]): FieldOption[] {
  return [
    JOB_OPTION,
    ...sections.flatMap((s) =>
      s.fields.map((f: { fieldKey: string; label: string }) => ({ fieldKey: f.fieldKey, label: f.label, section: s.name }))
    ),
  ];
}

const CHART_TYPES: { value: ChartMapping["chartType"]; label: string }[] = [
  { value: "pie", label: "Pie chart" },
  { value: "bar", label: "Bar chart" },
];

const CHART_ICONS: Record<ChartMapping["chartType"], React.ReactNode> = {
  pie: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path d="M10 2a8 8 0 1 0 0 16A8 8 0 0 0 10 2ZM9 4.062V10l-4.243 4.243A6 6 0 0 1 9 4.062ZM10.062 4a6 6 0 0 1 5.18 8.938L10.062 4Z" />
    </svg>
  ),
  bar: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path d="M3 4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4Zm5-3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V1Zm5 6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1V7Z" />
    </svg>
  ),
};

export function ChartConfigEditor({
  tenantId,
  sections,
  initialMappings,
}: {
  tenantId: string;
  sections: SectionSpec[];
  initialMappings: ChartMapping[];
}) {
  const fieldOptions = buildFieldOptions(sections);
  const [mappings, setMappings] = useState<ChartMapping[]>(initialMappings);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function addRow() {
    setMappings((prev) => [...prev, { fieldKey: JOB_OPTION.fieldKey, label: JOB_OPTION.label, chartType: "bar" }]);
  }

  function removeRow(idx: number) {
    setMappings((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateRow(idx: number, patch: Partial<ChartMapping>) {
    setMappings((prev) =>
      prev.map((m, i) => {
        if (i !== idx) return m;
        const updated = { ...m, ...patch };
        if (patch.fieldKey) {
          const opt = fieldOptions.find((f) => f.fieldKey === patch.fieldKey);
          if (opt) updated.label = opt.label;
        }
        return updated;
      })
    );
  }

  function save() {
    setSaved(false);
    startTransition(async () => {
      await updateChartMappings({ tenantId, chartMappings: mappings });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    });
  }

  if (fieldOptions.length === 0) {
    return (
      <p className="text-sm text-slate-500 italic">
        No form fields configured yet. Set up Sheet sync first — the fields it creates become available to chart here.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Each chart appears on the dashboard below the pipeline. Pick a form field and a chart type. The chart
        aggregates all applicants&apos; answers for that field into a live count.
      </p>

      {mappings.length === 0 ? (
        <p className="text-sm text-slate-400 italic">No charts configured yet.</p>
      ) : (
        <div className="space-y-2">
          {mappings.map((m, idx) => (
            <div key={idx} className="flex items-center gap-2">
              {/* Field selector */}
              <select
                value={m.fieldKey}
                onChange={(e) => updateRow(idx, { fieldKey: e.target.value })}
                className="min-w-0 flex-1 rounded-xl border-0 px-3.5 py-2 text-[13px] text-slate-900 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-orange-500"
              >
                {fieldOptions.map((f) => (
                  <option key={f.fieldKey} value={f.fieldKey}>
                    {f.label} ({f.section})
                  </option>
                ))}
              </select>

              {/* Chart type toggle */}
              <div className="flex shrink-0 overflow-hidden rounded-xl ring-1 ring-slate-200">
                {CHART_TYPES.map((ct) => (
                  <button
                    key={ct.value}
                    type="button"
                    onClick={() => updateRow(idx, { chartType: ct.value })}
                    className={`flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium transition-colors ${
                      m.chartType === ct.value
                        ? "bg-orange-500 text-white"
                        : "bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {CHART_ICONS[ct.value]}
                    {ct.label}
                  </button>
                ))}
              </div>

              {/* Remove */}
              <button
                type="button"
                onClick={() => removeRow(idx)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                aria-label="Remove"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5Zm0 1.5h2.5c.69 0 1.25.56 1.25 1.25v.285a44.522 44.522 0 0 0-5 0V3.75c0-.69.56-1.25 1.25-1.25ZM6.05 6.076l.814 10.178a1.25 1.25 0 0 0 1.246 1.146h4.807c.652 0 1.198-.49 1.246-1.14L14.95 6.076A42.448 42.448 0 0 1 10 6.5a42.448 42.448 0 0 1-4.95-.424Z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={addRow}
          className="flex items-center gap-1.5 text-[13px] font-medium text-orange-600 hover:text-orange-700"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
          </svg>
          Add chart
        </button>

        <Button type="button" size="sm" onClick={save} disabled={isPending}>
          {isPending ? "Saving…" : saved ? "Saved ✓" : "Save charts"}
        </Button>
      </div>
    </div>
  );
}
