import { describe, it, expect } from "vitest";
import { looksLikeReferenceText } from "./synopsis-template-validation";

describe("looksLikeReferenceText", () => {
  it("detects the reference panel's own text", () => {
    const referenceText = `
THIS CLIENT'S FORM FIELDS (insert one specific answer):
  Personal Details:
    {{field_abc123}}  - Father's/Husband's Name

SIMPLE VARIABLES (insert single values):
  {{candidateName}}      - Candidate's full name
`;
    expect(looksLikeReferenceText(referenceText)).toBe(true);
  });

  it("detects the loops-only fingerprint even without the form-fields section", () => {
    const text = "some text\nLOOPS (iterate through form sections):\nmore text";
    expect(looksLikeReferenceText(text)).toBe(true);
  });

  it("does not flag a real custom HTML template", () => {
    const realTemplate = `
<h2>{{candidateName}}</h2>
<p>Applied for: {{jobTitle}}</p>
{{#each formSections}}
  <h4>{{sectionName}}</h4>
{{/each}}
`;
    expect(looksLikeReferenceText(realTemplate)).toBe(false);
  });

  it("does not flag an empty template", () => {
    expect(looksLikeReferenceText("")).toBe(false);
  });
});
