"use client";

import { useState } from "react";
import { Button, inputClass } from "@/components/ui/primitives";

const TEMPLATE_VARIABLES = `
SIMPLE VARIABLES (insert single values):
  {{candidateName}}      - Candidate's full name
  {{candidateEmail}}     - Email address
  {{candidateMobile}}    - Phone number
  {{candidateDob}}       - Date of birth
  {{candidateGender}}    - Gender
  {{candidateStatus}}    - Application status
  {{jobTitle}}           - Position title
  {{department}}         - Department
  {{appliedDate}}        - Application date
  {{organizationName}}   - Organization name
  {{logoUrl}}            - Logo image URL
  {{generatedDate}}      - PDF generation time
  {{signatureImageUrl}}  - Signature image URL
  {{declarationText}}    - Declaration/terms text

LOOPS (iterate through form sections):
  {{#each formSections}}
    {{sectionName}}  - Section title (e.g., "Personal Info")
    {{#each fields}}
      {{fieldLabel}}  - Field name (e.g., "Full Name")
      {{fieldValue}}  - Candidate's answer
    {{/each}}
  {{/each}}

CONDITIONALS (show content only if exists):
  {{#if logoUrl}}
    <img src="{{logoUrl}}" />
  {{/if}}
  {{#if signatureImageUrl}}
    <img src="{{signatureImageUrl}}" />
  {{/if}}

EXAMPLE TEMPLATE:
  <h2>{{candidateName}}</h2>
  <p>Applied for: {{jobTitle}}</p>
  <h3>Form Answers:</h3>
  {{#each formSections}}
    <h4>{{sectionName}}</h4>
    {{#each fields}}
      <p>
        <strong>{{fieldLabel}}</strong>
        {{fieldValue}}
      </p>
    {{/each}}
  {{/each}}
`;

interface FormFieldOption {
  id: string;
  label: string;
  sectionName: string;
}

function groupBySection(fields: FormFieldOption[]): Record<string, FormFieldOption[]> {
  const groups: Record<string, FormFieldOption[]> = {};
  for (const field of fields) {
    (groups[field.sectionName] ??= []).push(field);
  }
  return groups;
}

// This client's actual mapped Sheet/application-form fields, as
// {{field_<id>}} tokens — the same field_<id> keys buildTemplateData() in
// synopsis.ts fills with each field's real answer at PDF-render time.
// Without this, the reference only showed the generic candidate-level
// variables and the {{#each formSections}} loop, with no way to know what
// to type to reference one specific mapped column directly.
function buildFieldVariablesText(formFields: FormFieldOption[]): string {
  if (formFields.length === 0) return "";
  const grouped = groupBySection(formFields);
  let text = "THIS CLIENT'S FORM FIELDS (insert one specific answer):\n";
  for (const [sectionName, fields] of Object.entries(grouped)) {
    text += `  ${sectionName}:\n`;
    for (const f of fields) {
      text += `    {{field_${f.id}}}  - ${f.label}\n`;
    }
  }
  return text + "\n";
}

export function SynopsisTemplateEditor({
  tenantId,
  initialTemplate,
  formFields = [],
}: {
  tenantId: string;
  initialTemplate: string | null;
  formFields?: FormFieldOption[];
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
            {buildFieldVariablesText(formFields) + TEMPLATE_VARIABLES}
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
