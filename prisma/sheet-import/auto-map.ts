// Best-effort auto-mapping from a Sheet's header row (+ a handful of
// sample data rows) to a SheetImportConfig, driven entirely by keyword
// matching on header text and cell-value shape — no AI, no external
// calls, just pattern matching generic enough to run against any
// client's Sheet, not tuned to one client's specific wording. It won't
// be perfect for every client; the admin reviews and corrects it in the
// builder afterward rather than typing every column by hand.
import type { CoreFieldMap, DocSpec, FieldSpec, SectionSpec, SheetImportConfig } from "./types";

function norm(v: unknown): string {
  return String(v ?? "").toLowerCase().trim();
}

// Strips a Google Form's leading "1. ", "12) " question numbering so the
// remaining text reads as a clean label/key.
function stripNumbering(v: unknown): string {
  return String(v ?? "").replace(/^\s*\d+[.)]\s*/, "").trim();
}

function slugify(v: unknown): string {
  const s = stripNumbering(v).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return s || "field";
}

const isAddedTimeHeader = (h: string) => /added\s*time|time\s*stamp|submitted\s*(on|at|time)|application\s*date/.test(h);
const isEmailHeader = (h: string) => /e-?mail/.test(h);
const isMobileHeader = (h: string) => /mobile|contact\s*no|phone\s*number|\bphone\b/.test(h);
const isDobHeader = (h: string) => /date\s*of\s*birth|\bdob\b/.test(h);
const isGenderHeader = (h: string) => /gender|\bsex\b/.test(h);
function isJobSelectorHeader(h: string) {
  // "Post-Graduation"/"Postgraduate" trips a naive /\bpost\b/ match (the
  // hyphen counts as a word boundary) even though it's an education
  // level, not a job post — this column choosing the wrong role would
  // send every application to the wrong Job, so the exclusion matters.
  if (/post[-\s]?grad/.test(h)) return false;
  return /\bpost\b|applying\s*for|applied\s*for|\bposition\b|subject\s*applied|\bsubjects?\b|\bjob\b/.test(h);
}
const isApplicationIdHeader = (h: string) => /unique\s*id|application\s*(no\.?|number)|reference\s*(no\.?|number)|^id$/.test(h);
function isFullNameHeader(h: string) {
  if (!/\bname\b/.test(h)) return false;
  if (/father|husband|mother|guardian|organi[sz]ation|institution|college|employer|spouse/.test(h)) return false;
  return true;
}

function isDocumentHeader(h: string) {
  // A header can mention "certificate" while still being a plain
  // yes/no or free-text question ("Whether you have an NCC Certificate?
  // Mention please.") rather than an upload field — question phrasing
  // rules those out even though the keyword matches.
  if (/\?|mention\s*please|please\s*(mention|describe|specify)|\bwhether\s*you\b/.test(h)) return false;
  return /upload|certificate|\bdocument\b|photo|signature|\bimage\b/.test(h);
}
const isIgnorableHeader = (h: string) => /ip\s*address|terms\s*and\s*conditions|\bpayment\b|captcha/.test(h);

// Google Forms with a "repeat this question" section (used for listing
// several qualifications/jobs held) export each repetition under a bare
// numeric header ("1", "2", "3", ...) — the header itself carries no
// meaning, but the cell value does: it's the same delimited
// "Label:value,Label:value" shape the app already knows how to render
// (see parseCompoundValue in the application detail page). Sniffing the
// sample row's first "Label:" tells us what kind of repeated entry this
// actually is, when the header alone can't.
function inferFromSampleValue(sampleValue: unknown): { section: string; label: string } | null {
  if (typeof sampleValue !== "string") return null;
  const firstPair = sampleValue.split(",")[0] ?? "";
  const match = firstPair.match(/^([^:]+):\s*(.*)$/);
  if (!match) return null;
  const key = match[1].trim().toLowerCase();
  const value = match[2].trim();
  if (key === "examination") return { section: "Educational Qualifications", label: value || "Qualification" };
  if (key === "designation") return { section: "Work Experience", label: value || "Experience" };
  return null;
}

function guessFieldType(h: string): FieldSpec["fieldType"] {
  if (/date/.test(h)) return "date";
  if (/e-?mail/.test(h)) return "email";
  if (/phone|mobile|contact\s*no/.test(h)) return "phone";
  if (/address|particulars|remarks|activities|description|details/.test(h)) return "textarea";
  return "text";
}

function guessSection(h: string): string {
  if (/exam|qualification|matric|graduat|passing|\bboard\b|university|marks|10\+2|academic/.test(h)) return "Educational Qualifications";
  if (/experience|designation|organi[sz]ation|institution|employer|job\s*\(/.test(h)) return "Work Experience";
  if (/activit|remark|particular|literary|cultural|\bsport|co-?curricular/.test(h)) return "Additional Information";
  return "Personal Details";
}

export type AutoMapResult = {
  config: SheetImportConfig;
  // Which core roles the heuristic couldn't find a confident match for —
  // the caller should flag these for the admin to check/fill in manually.
  unmatchedCoreRoles: (keyof CoreFieldMap)[];
};

// Looks across several sample rows (not just the first) for a column's
// first non-empty value — a repeated-question column is often blank for
// row 1's candidate but filled for a later one, and one blank sample
// would otherwise make an easily-inferable column fall back to a bare
// numbered label.
function firstNonEmptyValue(col: number, sampleRows: unknown[][]): unknown {
  for (const row of sampleRows) {
    const v = row[col];
    if (v !== null && v !== undefined && String(v).trim() !== "") return v;
  }
  return undefined;
}

// A single stray URL pasted into an unrelated text field (real data does
// have typos/mistakes) shouldn't be enough to mislabel that whole column
// as a document upload — require most of the sampled non-empty values to
// look like links, not just one.
function isLinkColumn(col: number, sampleRows: unknown[][]): boolean {
  let total = 0;
  let linkLike = 0;
  for (const row of sampleRows) {
    const v = row[col];
    if (v === null || v === undefined || String(v).trim() === "") continue;
    total++;
    if (typeof v === "string" && /^https?:\/\//.test(v.trim())) linkLike++;
  }
  return total > 0 && linkLike / total >= 0.5;
}

export function autoMapSheetColumns(headerRow: unknown[], sampleRows: unknown[][]): AutoMapResult {
  const headers = headerRow.map((h) => norm(h));
  const used = new Set<number>();

  function findAndClaim(test: (h: string) => boolean): number | null {
    for (let i = 0; i < headers.length; i++) {
      if (used.has(i) || !headers[i]) continue;
      if (test(headers[i])) {
        used.add(i);
        return i;
      }
    }
    return null;
  }

  const addedTimeCol = findAndClaim(isAddedTimeHeader);
  const emailCol = findAndClaim(isEmailHeader);
  const fullNameCol = findAndClaim(isFullNameHeader);
  const mobileCol = findAndClaim(isMobileHeader);
  const dobCol = findAndClaim(isDobHeader);
  const genderCol = findAndClaim(isGenderHeader);
  const jobSelectorCol = findAndClaim(isJobSelectorHeader);
  const applicationNumberCol = findAndClaim(isApplicationIdHeader);

  const unmatchedCoreRoles: (keyof CoreFieldMap)[] = [];
  if (addedTimeCol === null) unmatchedCoreRoles.push("addedTimeCol");
  if (emailCol === null) unmatchedCoreRoles.push("emailCol");
  if (fullNameCol === null) unmatchedCoreRoles.push("fullNameCol");
  if (jobSelectorCol === null) unmatchedCoreRoles.push("jobSelectorCol");
  if (applicationNumberCol === null) unmatchedCoreRoles.push("applicationNumberCol");

  const coreFields: CoreFieldMap = {
    addedTimeCol: addedTimeCol ?? 0,
    emailCol: emailCol ?? 0,
    fullNameCol: fullNameCol ?? 0,
    mobileCol,
    dobCol,
    genderCol,
    jobSelectorCol: jobSelectorCol ?? 0,
    applicationNumberCol,
  };

  const documents: DocSpec[] = [];
  const sectionOrder = ["Personal Details", "Educational Qualifications", "Work Experience", "Additional Information"];
  const sectionFields = new Map<string, FieldSpec[]>();
  const seenKeysPerSection = new Map<string, Set<string>>();
  // Tracks the section a bare-numeric-header column resolved to, so a
  // neighboring bare-numeric column with no sampled data of its own (an
  // optional repeated-question slot most candidates leave blank) can
  // still inherit the right section instead of falling back to generic.
  let lastBareNumberSection: string | null = null;

  for (let i = 0; i < headerRow.length; i++) {
    if (used.has(i)) continue;
    const rawHeader = headerRow[i];
    const h = norm(rawHeader);
    if (!h) continue;
    if (isIgnorableHeader(h)) continue;

    const sampleValue = firstNonEmptyValue(i, sampleRows);
    if (isDocumentHeader(h) || isLinkColumn(i, sampleRows)) {
      documents.push({ col: i, label: stripNumbering(rawHeader) || `Document ${i}` });
      continue;
    }

    const isBareNumberHeader = /^\d+$/.test(h);
    const inferred = isBareNumberHeader ? inferFromSampleValue(sampleValue) : null;
    const sectionName: string = inferred?.section ?? (isBareNumberHeader ? lastBareNumberSection : null) ?? guessSection(h);
    if (isBareNumberHeader) lastBareNumberSection = sectionName;
    const labelSource = inferred?.label ?? stripNumbering(rawHeader) ?? "";
    const label = labelSource || `Field ${i}`;
    const keySource = inferred?.label ?? rawHeader;

    const seen = seenKeysPerSection.get(sectionName) ?? new Set<string>();
    let fieldKey = slugify(keySource);
    let n = 2;
    while (seen.has(fieldKey)) fieldKey = `${slugify(keySource)}_${n++}`;
    seen.add(fieldKey);
    seenKeysPerSection.set(sectionName, seen);

    const list = sectionFields.get(sectionName) ?? [];
    list.push({ col: i, fieldKey, label, fieldType: guessFieldType(h) });
    sectionFields.set(sectionName, list);
  }

  const sections: SectionSpec[] = sectionOrder
    .filter((name) => sectionFields.has(name))
    .map((name) => ({ name, fields: sectionFields.get(name)! }));

  const config: SheetImportConfig = {
    formName: "",
    applicationNumberPrefix: "",
    jobTitleTemplate: "{value}",
    jobCodeTemplate: "",
    jobEmploymentType: "",
    coreFields,
    sections,
    documents,
  };

  return { config, unmatchedCoreRoles };
}
