"use client";

import { useState } from "react";
import { Card, CardHeader, Field, inputClass, Button } from "@/components/ui/primitives";
import { updateTenantSheetConfig, updateTenantSheetSourceUrl } from "@/lib/actions/tenants";
import { toSheetExportUrl, type SheetImportConfig, type FieldSpec, type SectionSpec, type DocSpec } from "../../../prisma/sheet-import/types";

const FIELD_TYPES: FieldSpec["fieldType"][] = ["text", "textarea", "number", "date", "email", "phone"];

const EMPTY_CONFIG: SheetImportConfig = {
  formName: "",
  applicationNumberPrefix: "",
  jobTitleTemplate: "{value}",
  jobCodeTemplate: "",
  jobEmploymentType: "",
  coreFields: {
    addedTimeCol: 0,
    emailCol: 0,
    fullNameCol: 0,
    mobileCol: null,
    dobCol: null,
    genderCol: null,
    jobSelectorCol: 0,
    applicationNumberCol: null,
  },
  sections: [],
  documents: [],
};

function numOrNull(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function SheetConfigBuilder({
  tenantId,
  initialSheetSourceUrl,
  initialConfig,
}: {
  tenantId: string;
  initialSheetSourceUrl: string;
  initialConfig: SheetImportConfig | null;
}) {
  const [sheetSourceUrl, setSheetSourceUrl] = useState(initialSheetSourceUrl);
  const [config, setConfig] = useState<SheetImportConfig>(initialConfig ?? EMPTY_CONFIG);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingUrl, setSavingUrl] = useState(false);
  const [urlSavedAt, setUrlSavedAt] = useState<number | null>(null);

  const handleSaveUrlOnly = async () => {
    setSavingUrl(true);
    try {
      const saved = await updateTenantSheetSourceUrl({ tenantId, sheetSourceUrl });
      setSheetSourceUrl(saved ?? "");
      setUrlSavedAt(Date.now());
    } finally {
      setSavingUrl(false);
    }
  };

  const update = (patch: Partial<SheetImportConfig>) => setConfig((c) => ({ ...c, ...patch }));

  const addSection = () => update({ sections: [...config.sections, { name: "New Section", fields: [] }] });
  const removeSection = (i: number) => update({ sections: config.sections.filter((_, idx) => idx !== i) });
  const updateSection = (i: number, patch: Partial<SectionSpec>) =>
    update({ sections: config.sections.map((s, idx) => (idx === i ? { ...s, ...patch } : s)) });

  const addField = (sectionIndex: number) => {
    const section = config.sections[sectionIndex];
    const newField: FieldSpec = { col: 0, fieldKey: "", label: "", fieldType: "text" };
    updateSection(sectionIndex, { fields: [...section.fields, newField] });
  };
  const removeField = (sectionIndex: number, fieldIndex: number) => {
    const section = config.sections[sectionIndex];
    updateSection(sectionIndex, { fields: section.fields.filter((_, idx) => idx !== fieldIndex) });
  };
  const updateField = (sectionIndex: number, fieldIndex: number, patch: Partial<FieldSpec>) => {
    const section = config.sections[sectionIndex];
    updateSection(sectionIndex, {
      fields: section.fields.map((f, idx) => (idx === fieldIndex ? { ...f, ...patch } : f)),
    });
  };

  const addDocument = () => update({ documents: [...config.documents, { col: 0, label: "" }] });
  const removeDocument = (i: number) => update({ documents: config.documents.filter((_, idx) => idx !== i) });
  const updateDocument = (i: number, patch: Partial<DocSpec>) =>
    update({ documents: config.documents.map((d, idx) => (idx === i ? { ...d, ...patch } : d)) });

  const hasIdColumn = config.coreFields.applicationNumberCol !== null;

  const handleSave = async () => {
    setError(null);
    if (!config.formName.trim()) return setError("Application form name is required.");
    if (!hasIdColumn && !config.applicationNumberPrefix.trim())
      return setError("Application number prefix is required when you don't map a unique-ID column below.");
    if (config.sections.length === 0) return setError("Add at least one section.");

    setSaving(true);
    try {
      await updateTenantSheetConfig({ tenantId, sheetSourceUrl, config });
      setSavedAt(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Google Sheet source"
          description="The published CSV/XLSX export URL for this client's Google Sheet."
        />
        <div className="space-y-4 px-5 py-5">
          <Field
            label="Sheet export URL"
            htmlFor="sheetSourceUrl"
            hint="Paste the normal Share link (…/edit?usp=sharing), then Convert — or just Save, it's applied automatically either way."
          >
            <div className="flex items-center gap-2">
              <input
                id="sheetSourceUrl"
                value={sheetSourceUrl}
                onChange={(e) => {
                  setSheetSourceUrl(e.target.value);
                  setUrlSavedAt(null);
                }}
                className={`${inputClass} flex-1`}
                placeholder="https://docs.google.com/spreadsheets/d/.../edit?usp=sharing"
              />
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => setSheetSourceUrl((url) => toSheetExportUrl(url))}
                disabled={!sheetSourceUrl || toSheetExportUrl(sheetSourceUrl) === sheetSourceUrl}
              >
                Convert
              </Button>
              <Button type="button" size="sm" onClick={handleSaveUrlOnly} disabled={savingUrl}>
                {savingUrl ? "Saving…" : "Save URL"}
              </Button>
            </div>
            {urlSavedAt ? <p className="mt-1 text-xs text-emerald-600">Sheet URL saved.</p> : null}
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Application form name" htmlFor="formName" required>
              <input
                id="formName"
                value={config.formName}
                onChange={(e) => update({ formName: e.target.value })}
                className={inputClass}
                placeholder="Assistant Professor Application — Standard"
              />
            </Field>
            <Field
              label="Application number prefix"
              htmlFor="prefix"
              required={!hasIdColumn}
              hint={
                hasIdColumn
                  ? "Optional — prepended to the ID column mapped below. Leave blank to use that column's value as-is."
                  : "Required since no unique-ID column is mapped below — applications get auto-numbered DN-2026-IMP-0001, -0002, ..."
              }
            >
              <input
                id="prefix"
                value={config.applicationNumberPrefix}
                onChange={(e) => update({ applicationNumberPrefix: e.target.value })}
                className={inputClass}
                placeholder="DN-2026-IMP-"
              />
            </Field>
            <Field label="Job title template" htmlFor="jobTitleTemplate" hint="{value} = raw cell text">
              <input
                id="jobTitleTemplate"
                value={config.jobTitleTemplate}
                onChange={(e) => update({ jobTitleTemplate: e.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label="Job code template" htmlFor="jobCodeTemplate" hint="{value3} = first 3 chars, uppercased">
              <input
                id="jobCodeTemplate"
                value={config.jobCodeTemplate}
                onChange={(e) => update({ jobCodeTemplate: e.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label="Employment type" htmlFor="employmentType">
              <input
                id="employmentType"
                value={config.jobEmploymentType ?? ""}
                onChange={(e) => update({ jobEmploymentType: e.target.value })}
                className={inputClass}
                placeholder="e.g. Assistant Professor — Regular"
              />
            </Field>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Core columns"
          description="Spreadsheet column numbers, 0-indexed (column A = 0, B = 1, C = 2, …). Leave optional ones blank if not present. If the sheet already has its own unique ID column, set it below — otherwise application numbers are auto-generated in order."
        />
        <div className="grid grid-cols-2 gap-4 px-5 py-5 sm:grid-cols-4">
          <ColInput label="Submitted time" value={config.coreFields.addedTimeCol} onChange={(v) => update({ coreFields: { ...config.coreFields, addedTimeCol: v ?? 0 } })} />
          <ColInput label="Email" value={config.coreFields.emailCol} onChange={(v) => update({ coreFields: { ...config.coreFields, emailCol: v ?? 0 } })} />
          <ColInput label="Full name" value={config.coreFields.fullNameCol} onChange={(v) => update({ coreFields: { ...config.coreFields, fullNameCol: v ?? 0 } })} />
          <ColInput label="Job selector (post applied for)" value={config.coreFields.jobSelectorCol} onChange={(v) => update({ coreFields: { ...config.coreFields, jobSelectorCol: v ?? 0 } })} />
          <ColInput
            label="Application/unique ID (optional)"
            value={config.coreFields.applicationNumberCol}
            onChange={(v) => update({ coreFields: { ...config.coreFields, applicationNumberCol: v } })}
            optional
          />
          <ColInput label="Mobile (optional)" value={config.coreFields.mobileCol} onChange={(v) => update({ coreFields: { ...config.coreFields, mobileCol: v } })} optional />
          <ColInput label="Date of birth (optional)" value={config.coreFields.dobCol} onChange={(v) => update({ coreFields: { ...config.coreFields, dobCol: v } })} optional />
          <ColInput label="Gender (optional)" value={config.coreFields.genderCol} onChange={(v) => update({ coreFields: { ...config.coreFields, genderCol: v } })} optional />
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Form sections & fields"
          description="Every other column the candidate fills in, grouped into sections shown on the application form."
          action={
            <Button type="button" size="sm" variant="secondary" onClick={addSection}>
              + Add section
            </Button>
          }
        />
        <div className="space-y-4 px-5 py-5">
          {config.sections.length === 0 ? (
            <p className="text-sm text-slate-400 italic">No sections yet — add one to start mapping columns.</p>
          ) : (
            config.sections.map((section, si) => (
              <div key={si} className="rounded-lg border border-slate-200">
                <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2.5">
                  <input
                    value={section.name}
                    onChange={(e) => updateSection(si, { name: e.target.value })}
                    className={`${inputClass} flex-1`}
                    placeholder="Section name"
                  />
                  <Button type="button" size="sm" variant="ghost" onClick={() => addField(si)}>
                    + Field
                  </Button>
                  <Button type="button" size="sm" variant="danger" onClick={() => removeSection(si)}>
                    Remove
                  </Button>
                </div>
                <div className="space-y-2 px-4 py-3">
                  {section.fields.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No fields in this section yet.</p>
                  ) : (
                    section.fields.map((field, fi) => (
                      <div key={fi} className="grid grid-cols-12 items-center gap-2">
                        <input
                          type="number"
                          value={field.col}
                          onChange={(e) => updateField(si, fi, { col: Number(e.target.value) })}
                          className={`${inputClass} col-span-2`}
                          placeholder="Col"
                          title="Spreadsheet column number (0-indexed)"
                        />
                        <input
                          value={field.fieldKey}
                          onChange={(e) => updateField(si, fi, { fieldKey: e.target.value })}
                          className={`${inputClass} col-span-3`}
                          placeholder="field_key"
                        />
                        <input
                          value={field.label}
                          onChange={(e) => updateField(si, fi, { label: e.target.value })}
                          className={`${inputClass} col-span-4`}
                          placeholder="Label shown to admin"
                        />
                        <select
                          value={field.fieldType}
                          onChange={(e) => updateField(si, fi, { fieldType: e.target.value as FieldSpec["fieldType"] })}
                          className={`${inputClass} col-span-2`}
                        >
                          {FIELD_TYPES.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => removeField(si, fi)}
                          className="col-span-1 text-xs font-medium text-red-600 hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Document columns"
          description="Columns holding a link to an uploaded document (e.g. Drive link)."
          action={
            <Button type="button" size="sm" variant="secondary" onClick={addDocument}>
              + Add document
            </Button>
          }
        />
        <div className="space-y-2 px-5 py-5">
          {config.documents.length === 0 ? (
            <p className="text-sm text-slate-400 italic">No document columns configured.</p>
          ) : (
            config.documents.map((doc, di) => (
              <div key={di} className="grid grid-cols-12 items-center gap-2">
                <input
                  type="number"
                  value={doc.col}
                  onChange={(e) => updateDocument(di, { col: Number(e.target.value) })}
                  className={`${inputClass} col-span-2`}
                  placeholder="Col"
                />
                <input
                  value={doc.label}
                  onChange={(e) => updateDocument(di, { label: e.target.value })}
                  className={`${inputClass} col-span-9`}
                  placeholder="e.g. Photograph"
                />
                <button
                  type="button"
                  onClick={() => removeDocument(di)}
                  className="col-span-1 text-xs font-medium text-red-600 hover:underline"
                >
                  Remove
                </button>
              </div>
            ))
          )}
        </div>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="button" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save sheet config"}
        </Button>
        {error ? <span className="text-sm text-red-600">{error}</span> : null}
        {!error && savedAt ? <span className="text-sm text-emerald-600">Saved.</span> : null}
      </div>
    </div>
  );
}

function ColInput({
  label,
  value,
  onChange,
  optional,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  optional?: boolean;
}) {
  return (
    <Field label={label} htmlFor={label}>
      <input
        id={label}
        type="number"
        value={value ?? ""}
        onChange={(e) => onChange(optional ? numOrNull(e.target.value) : Number(e.target.value) || 0)}
        className={inputClass}
      />
    </Field>
  );
}
