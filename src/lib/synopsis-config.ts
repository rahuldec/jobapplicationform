// Which sections/fields a tenant's synopsis PDF includes — admin-editable,
// see the "Synopsis" section on the tenant admin page. Full Name isn't
// listed since it's the report's identity and never hidden. Form sections
// are excluded by id rather than included, so a section added to the
// application form later shows up automatically instead of needing to be
// opted back in.
//
// Split out from src/lib/synopsis.ts (rather than defined there) so the
// admin config server action can import just these small constants/types
// without pulling pdfkit into that action's bundle.

export const CANDIDATE_FIELD_OPTIONS = [
  { key: "email", label: "Email" },
  { key: "mobile", label: "Mobile" },
  { key: "dob", label: "Date of Birth" },
  { key: "gender", label: "Gender" },
  { key: "status", label: "Status" },
] as const;

export const APPLICATION_FIELD_OPTIONS = [
  { key: "job", label: "Job" },
  { key: "department", label: "Department" },
  { key: "appliedOn", label: "Applied On" },
] as const;

export type SynopsisConfig = {
  excludedCandidateFields: string[];
  excludedApplicationFields: string[];
  hideDeclaration: boolean;
  excludedFormSectionIds: string[];
};

const EMPTY_SYNOPSIS_CONFIG: SynopsisConfig = {
  excludedCandidateFields: [],
  excludedApplicationFields: [],
  hideDeclaration: false,
  excludedFormSectionIds: [],
};

export function parseSynopsisConfig(json: string | null | undefined): SynopsisConfig {
  if (!json) return EMPTY_SYNOPSIS_CONFIG;
  try {
    const parsed = JSON.parse(json);
    return {
      excludedCandidateFields: Array.isArray(parsed.excludedCandidateFields) ? parsed.excludedCandidateFields : [],
      excludedApplicationFields: Array.isArray(parsed.excludedApplicationFields) ? parsed.excludedApplicationFields : [],
      hideDeclaration: parsed.hideDeclaration === true,
      excludedFormSectionIds: Array.isArray(parsed.excludedFormSectionIds) ? parsed.excludedFormSectionIds : [],
    };
  } catch {
    // Malformed config shouldn't break PDF generation — fall back to showing everything.
    return EMPTY_SYNOPSIS_CONFIG;
  }
}
