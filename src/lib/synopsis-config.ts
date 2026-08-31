// Which sections/fields a tenant's synopsis PDF includes, and in what
// order — admin-editable, see the "Synopsis" section on the tenant admin
// page. Full Name isn't listed since it's the report's identity and
// never hidden. Form sections are excluded by id rather than included,
// so a section added to the application form later shows up
// automatically instead of needing to be opted back in.
//
// Split out from src/lib/synopsis.ts (rather than defined there) so the
// admin config server action/client component don't pull pdfkit into
// their bundle just to read a few booleans and an order array.

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

// Fixed block ids for the two built-in detail groups and the closing
// declaration — a form section's block id is `section:<sectionId>`.
export const CANDIDATE_DETAILS_BLOCK = "candidateDetails";
export const APPLICATION_DETAILS_BLOCK = "applicationDetails";
export const DECLARATION_BLOCK = "declaration";
const SECTION_BLOCK_PREFIX = "section:";
export const sectionBlockId = (sectionId: string) => `${SECTION_BLOCK_PREFIX}${sectionId}`;
export const isFormSectionBlock = (blockId: string) => blockId.startsWith(SECTION_BLOCK_PREFIX);
export const formSectionIdFromBlock = (blockId: string) => blockId.slice(SECTION_BLOCK_PREFIX.length);

export type SynopsisConfig = {
  excludedCandidateFields: string[];
  excludedApplicationFields: string[];
  hideDeclaration: boolean;
  excludedFormSectionIds: string[];
  // Explicit block order. Empty means "use the natural default order"
  // (candidate details, application details, form sections in their own
  // order, declaration) — see resolveBlockOrder.
  blockOrder: string[];
};

const EMPTY_SYNOPSIS_CONFIG: SynopsisConfig = {
  excludedCandidateFields: [],
  excludedApplicationFields: [],
  hideDeclaration: false,
  excludedFormSectionIds: [],
  blockOrder: [],
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
      blockOrder: Array.isArray(parsed.blockOrder) ? parsed.blockOrder : [],
    };
  } catch {
    // Malformed config shouldn't break PDF generation — fall back to showing everything.
    return EMPTY_SYNOPSIS_CONFIG;
  }
}

// The order blocks render in when nothing has been customized —
// candidate details, application details, form sections in their own
// saved order, then the declaration.
export function defaultBlockOrder(formSectionIds: string[]): string[] {
  return [CANDIDATE_DETAILS_BLOCK, APPLICATION_DETAILS_BLOCK, ...formSectionIds.map(sectionBlockId), DECLARATION_BLOCK];
}

// Reconciles a saved order against the blocks that actually exist right
// now: drops ids for a section that's since been removed, and appends
// any block not yet in the saved order (a section added after the admin
// last customized this) at its natural default position rather than
// silently dropping it or always shoving it to the very end — it's
// inserted just before the first following block that IS in the saved
// order, so new sections land roughly where they'd naturally fall.
export function resolveBlockOrder(savedOrder: string[], formSectionIds: string[]): string[] {
  const allBlocks = defaultBlockOrder(formSectionIds);
  if (savedOrder.length === 0) return allBlocks;

  const allBlocksSet = new Set(allBlocks);
  const known = savedOrder.filter((id) => allBlocksSet.has(id));
  const knownSet = new Set(known);
  const missing = allBlocks.filter((id) => !knownSet.has(id));
  if (missing.length === 0) return known;

  // Walk the natural default order, inserting each known block as we
  // reach it (in the saved sequence) and interleaving any missing block
  // at the point it naturally occurs — keeps a newly-added section from
  // always jumping to the end regardless of where it sits in the form.
  const result: string[] = [];
  let knownIdx = 0;
  for (const id of allBlocks) {
    if (missing.includes(id)) {
      result.push(id);
    } else {
      result.push(known[knownIdx]);
      knownIdx++;
    }
  }
  return result;
}
