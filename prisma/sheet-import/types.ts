// The shape of Tenant.sheetMappingJson — everything about how one
// client's Google Sheet export maps onto our data model. A new client
// means writing one of these, not touching the sync engine.

export type FieldSpec = {
  col: number;
  fieldKey: string;
  label: string;
  fieldType: "text" | "textarea" | "number" | "date" | "email" | "phone";
};

export type DocSpec = { col: number; label: string };

export type SectionSpec = { name: string; fields: FieldSpec[] };

// Columns that map onto the Candidate/Application/Job models directly,
// rather than into the dynamic FormField system — every client's Sheet
// needs these regardless of how their custom fields are laid out.
export type CoreFieldMap = {
  addedTimeCol: number; // submission timestamp; falls back to "now" if not a real Date
  emailCol: number;
  fullNameCol: number;
  mobileCol: number | null;
  dobCol: number | null;
  genderCol: number | null;
  // The column whose value determines which Job (post) this row belongs
  // to — e.g. "Subject Applied For". Rows whose value doesn't resolve to
  // a configured job get skipped, same as a missing name/email.
  jobSelectorCol: number;
};

export type SheetImportConfig = {
  // Name for the ApplicationForm record created to hold `sections` —
  // shown in the Jobs page's "Application form" card.
  formName: string;
  // Prefix for generated application numbers, e.g. "NBGSM-2026-IMP-" —
  // the sync's "how far have we already imported" check parses this
  // prefix back out, so changing it after go-live would restart numbering.
  applicationNumberPrefix: string;
  // Job title/code derived from the jobSelectorCol's value. "{value}" is
  // replaced with the raw cell text; "{value3}" with its first 3
  // characters, uppercased (handy for short job codes).
  jobTitleTemplate: string;
  jobCodeTemplate: string;
  jobEmploymentType?: string;
  coreFields: CoreFieldMap;
  sections: SectionSpec[];
  documents: DocSpec[];
};

export function parseSheetImportConfig(json: string): SheetImportConfig {
  const config = JSON.parse(json) as SheetImportConfig;
  if (!config.sections?.length) throw new Error("SheetImportConfig has no sections");
  if (!config.coreFields) throw new Error("SheetImportConfig has no coreFields");
  return config;
}
