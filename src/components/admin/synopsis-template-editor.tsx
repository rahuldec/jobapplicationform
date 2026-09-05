"use client";

import { useState } from "react";
import { Button, inputClass } from "@/components/ui/primitives";

const TEMPLATE_VARIABLES = `
Available template variables:

Candidate Info:
- {{candidateName}} - Full name
- {{candidateEmail}} - Email address
- {{candidateMobile}} - Mobile number
- {{candidateDob}} - Date of birth
- {{candidateGender}} - Gender
- {{candidateStatus}} - Application status

Application Info:
- {{jobTitle}} - Position title
- {{department}} - Department
- {{appliedDate}} - Application date

Organization:
- {{organizationName}} - Tenant name
- {{logoUrl}} - Logo image URL (if set in branding)

Signature:
- {{signatureImageUrl}} - Candidate's signature image
- {{declarationText}} - Declaration/terms text
- {{generatedDate}} - PDF generation date/time

Form Sections:
- {{#each formSections}}
    {{sectionName}} - Section title
    {{#each fields}}
      {{fieldLabel}} - Field label
      {{fieldValue}} - Field value
    {{/each}}
  {{/each}}

Conditionals:
- {{#if variable}} content {{/if}} - Show content only if variable is truthy
- {{#if signatureImageUrl}} <img src="{{signatureImageUrl}}"> {{/if}}

Loops:
- {{#each items}} <li>{{\.name}}</li> {{/each}} - Iterate array items
`;

export function SynopsisTemplateEditor({
  tenantId,
  initialTemplate,
}: {
  tenantId: string;
  initialTemplate: string | null;
}) {
  const [template, setTemplate] = useState(initialTemplate || "");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/admin/synopsis-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, template }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSavedAt(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 px-5 py-5">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Template Editor */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Custom Template (HTML)
          </label>
          <textarea
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            placeholder="Paste your custom HTML template here or leave blank to use default..."
            className={`${inputClass} font-mono text-xs h-96 resize-y`}
          />
          <div className="text-xs text-slate-500 mt-2">
            Leave empty to use the built-in default template.
          </div>
        </div>

        {/* Variables Reference */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Available Variables
          </label>
          <pre className="bg-slate-900 text-slate-100 p-3 rounded font-mono text-xs h-96 overflow-auto">
            {TEMPLATE_VARIABLES}
          </pre>
        </div>
      </div>

      <div className="flex items-center gap-3 border-t border-slate-100 pt-4">
        <Button type="button" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save Template"}
        </Button>
        {error ? <span className="text-sm text-red-600">{error}</span> : null}
        {!error && savedAt ? <span className="text-sm text-emerald-600">Saved.</span> : null}
      </div>
    </div>
  );
}
