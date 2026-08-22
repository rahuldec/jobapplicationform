import { createScoringPattern } from "@/lib/actions/scoring";
import { Card, CardHeader, Field, inputClass, Button } from "@/components/ui/primitives";

export default function NewScoringPatternPage() {
  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Create Scoring Pattern</h1>
        <p className="text-sm text-slate-500">
          This starts completely blank — you&apos;ll add every criterion yourself in the next step.
        </p>
      </div>

      <Card>
        <CardHeader title="Pattern details" />
        <form action={createScoringPattern} className="space-y-4 px-5 py-5">
          <Field label="Scoring pattern name" htmlFor="name" required>
            <input id="name" name="name" required className={inputClass} placeholder="e.g. Assistant Professor — 2026 Cycle" />
          </Field>
          <Field label="Description" htmlFor="description">
            <textarea id="description" name="description" rows={3} className={inputClass} />
          </Field>
          <Field
            label="Maximum score"
            htmlFor="maxScore"
            hint="Optional. Leave blank if you don't want a fixed maximum — you define this, the platform does not assume 100."
          >
            <input id="maxScore" name="maxScore" type="number" step="0.01" className={inputClass} placeholder="e.g. 100" />
          </Field>
          <div className="flex justify-end border-t border-slate-100 pt-4">
            <Button type="submit">Create Pattern</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
