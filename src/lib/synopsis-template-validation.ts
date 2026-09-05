// A real user pasted the "Available Variables" reference panel's own text
// into the Custom Template box and saved it — the resulting PDF was just
// the reference documentation itself, with its {{tokens}} substituted,
// since renderTemplate() has no way to know "this isn't actually markup."
// These phrases are unique to the auto-generated reference text (see
// synopsis-template-editor.tsx) and would never legitimately appear in
// someone's own HTML, so treat their presence as certain proof of that
// exact mistake and refuse to save — both client- and server-side.
export const REFERENCE_TEXT_FINGERPRINTS = [
  "SIMPLE VARIABLES (insert single values):",
  "THIS CLIENT'S FORM FIELDS (insert one specific answer):",
  "LOOPS (iterate through form sections):",
];

export function looksLikeReferenceText(text: string): boolean {
  return REFERENCE_TEXT_FINGERPRINTS.some((fp) => text.includes(fp));
}
