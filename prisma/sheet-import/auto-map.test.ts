import { describe, expect, it } from "vitest";
import { autoMapSheetColumns } from "./auto-map";

// Real header row from a live client's Google Form export (Doon Nagar
// College), captured verbatim while building this feature. Using the
// actual header wording — not a simplified stand-in — is what catches
// real-world phrasing bugs; the synthetic fixtures further down target
// specific bugs this exact data didn't happen to trigger.
const DN_HEADER_ROW = [
  "Added Time",
  "IP Address",
  "Terms and Conditions",
  "Unique ID",
  "1. Post the which you are applying",
  "2. Name",
  "3. Father's/Husband's Name",
  "4. Date of Birth",
  "5. Marital Status",
  "6. Your Present pay and scale,  state separately",
  "7. Total Experience",
  "8. Category",
  "9. Aadhar Number",
  "10. Address",
  "Mobile No.",
  "Email",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "Metric Document Upload",
  "10+2 Document Upload",
  "Graduation Document Upload",
  "Post-Graduation Document Upload",
  "1",
  "2",
  "3",
  "4",
  "Experience Letter Upload",
  "13. Give the name of Literary, Cultural, or Similar other activities in which you take part.",
  "14. Any other particulars that you may like to give.",
  "15. Applicant's Image",
  "16. Applicant Signature",
  "Payment Amount",
  "Payment Status",
  "Payment Currency",
  "Payment Merchant",
];

const DN_SAMPLE_ROW: unknown[] = [
  new Date(2026, 7, 2),
  null,
  "Agreed",
  "DN-1",
  "Deputy Superintendent",
  "ANIL SHARMA",
  "KRISHAN CHAND",
  new Date(1987, 11, 13),
  "Married",
  52000,
  18,
  "General",
  849673708631,
  "232 HOUSING BOARD COLONY, SIRSA ROAD HISAR, HARYANA, 125001, INDIA",
  8930492893,
  "anilsharma1412@gmail.com",
  "Examination:10th,Year of Passing:2004,Board/University:BSEH,Max Marks:600,Marks Obtained:333",
  "Examination:12th,Year of Passing:2006,Board/University:BSEH,Max Marks:500,Marks Obtained:273",
  "Examination:BCA,Year of Passing:2010,Board/University:GJU S&T Hisar,Max Marks:2250",
  null,
  null,
  null,
  null,
  "https://drive.google.com/file/d/1A9_yPIkVXDct7mKCsYe3tCSFjyCFFHlu/view?usp=drivesdk",
  "https://drive.google.com/file/d/1IjDOfdIfiglqwRu4g5Fs_S2fMSTNvVMy/view?usp=drivesdk",
  "https://drive.google.com/file/d/1G4zz3YNSVywXNsWw_7se1CgJGXTTYQiO/view?usp=drivesdk",
  null,
  "Designation:Lab. Attendant,Name of the Organization/Institution:Dayanand College Hisar,Job (Regular/Temporary):Temporary",
  "Designation:Lab. Assistant,Name of the Organization/Institution:Dayanand College Hisar,Job (Regular/Temporary):Regular",
  null,
  null,
  "https://drive.google.com/file/d/1NQQcuAx6D3R6cg9l4iwVks4tFpVqqEQY/view?usp=drivesdk",
  "Nil",
  "I Have Computer And Accounts Knowledge.",
  "https://drive.google.com/file/d/1uIeSv4kG79UY4lkFWZp9gZHDMu0jptRX/view?usp=drivesdk",
  "https://drive.google.com/file/d/13axpRc7_tDRt9K8QeHVUL4Y1YUdWY7VC/view?usp=drivesdk",
  1029.5,
  "Completed",
  "INR",
  "Razor Pay",
];

describe("autoMapSheetColumns — real client sheet (Doon Nagar College)", () => {
  const { config, unmatchedCoreRoles } = autoMapSheetColumns(DN_HEADER_ROW, [DN_SAMPLE_ROW]);

  it("detects every required core column with no ambiguity", () => {
    expect(unmatchedCoreRoles).toEqual([]);
  });

  it("maps core fields to the correct columns", () => {
    expect(config.coreFields).toEqual({
      addedTimeCol: 0,
      emailCol: 15,
      fullNameCol: 5,
      mobileCol: 14,
      dobCol: 7,
      genderCol: null, // this sheet genuinely has no gender column
      jobSelectorCol: 4,
      applicationNumberCol: 3,
    });
  });

  it("detects all 7 real document-upload columns", () => {
    const cols = config.documents.map((d) => d.col).sort((a, b) => a - b);
    expect(cols).toEqual([23, 24, 25, 26, 31, 34, 35]);
  });

  it("excludes IP Address, Terms and Conditions, and payment columns entirely", () => {
    const allCols = new Set([
      ...Object.values(config.coreFields).filter((v): v is number => v !== null),
      ...config.documents.map((d) => d.col),
      ...config.sections.flatMap((s) => s.fields.map((f) => f.col)),
    ]);
    expect(allCols.has(1)).toBe(false); // IP Address
    expect(allCols.has(2)).toBe(false); // Terms and Conditions
    expect(allCols.has(36)).toBe(false); // Payment Amount
    expect(allCols.has(37)).toBe(false); // Payment Status
    expect(allCols.has(38)).toBe(false); // Payment Currency
    expect(allCols.has(39)).toBe(false); // Payment Merchant
  });

  it("buckets Total Experience into Work Experience via the 'experience' keyword", () => {
    const workExp = config.sections.find((s) => s.name === "Work Experience");
    expect(workExp?.fields.some((f) => f.col === 10)).toBe(true);
  });

  it("uses textarea for the address field", () => {
    const addressField = config.sections.flatMap((s) => s.fields).find((f) => f.col === 13);
    expect(addressField?.fieldType).toBe("textarea");
  });
});

describe("autoMapSheetColumns — bug regressions caught during manual testing", () => {
  it('does not let "Post-Graduation" satisfy the job-selector column (word-boundary false match on "post")', () => {
    // This is the exact bug found against NBGSM's real sheet: a naive
    // /\bpost\b/ match crosses the hyphen in "Post-Graduation" and would
    // have routed every application to the wrong Job.
    const headers = ["Added Time", "Full Name", "Email", "Post-Graduation", "Choose Subjects"];
    const { config } = autoMapSheetColumns(headers, [[new Date(), "A Name", "a@b.com", "MA English", "Commerce"]]);
    expect(config.coreFields.jobSelectorCol).toBe(4); // "Choose Subjects", not 3
  });

  it('does not classify a yes/no question mentioning "Certificate" as a document upload', () => {
    // Real header: "Whether you have NCC 'C' or 'B' Certificate? Mention
    // Please." — matched the "certificate" keyword but is a text
    // question, not an upload field.
    const headers = [
      "Added Time",
      "Full Name",
      "Email",
      "Post",
      "Whether you have NCC 'C' or 'B' Certificate? Mention Please.",
    ];
    const { config } = autoMapSheetColumns(headers, [[new Date(), "A Name", "a@b.com", "Commerce", "Yes"]]);
    expect(config.documents.some((d) => d.col === 4)).toBe(false);
    const allFieldCols = config.sections.flatMap((s) => s.fields.map((f) => f.col));
    expect(allFieldCols).toContain(4);
  });

  it("still classifies a genuine upload column even when its header lacks upload/document keywords", () => {
    const headers = ["Added Time", "Full Name", "Email", "Post", "10+2"];
    const linkRows = Array.from({ length: 5 }, (_, i) => [
      new Date(),
      "A Name",
      "a@b.com",
      "Commerce",
      `https://drive.google.com/file/d/abc${i}/view`,
    ]);
    const { config } = autoMapSheetColumns(headers, linkRows);
    expect(config.documents.some((d) => d.col === 4)).toBe(true);
  });

  it("requires most sampled values to look like links before calling a column a document (ignores one stray pasted URL)", () => {
    const headers = ["Added Time", "Full Name", "Email", "Post", "Present Pay Scale"];
    const rows = [
      [new Date(), "A", "a@b.com", "Commerce", "https://accidentally-pasted-a-link.example.com"],
      [new Date(), "B", "b@b.com", "Commerce", "45000"],
      [new Date(), "C", "c@b.com", "Commerce", "52000"],
      [new Date(), "D", "d@b.com", "Commerce", "38000"],
    ];
    const { config } = autoMapSheetColumns(headers, rows);
    expect(config.documents.some((d) => d.col === 4)).toBe(false);
  });

  it("infers section/label for a bare-numeric repeated-question column from its compound cell value", () => {
    const headers = ["Added Time", "Full Name", "Email", "Post", "1"];
    const rows = [[new Date(), "A", "a@b.com", "Commerce", "Examination:MBA,Year of Passing:2015"]];
    const { config } = autoMapSheetColumns(headers, rows);
    const field = config.sections.find((s) => s.name === "Educational Qualifications")?.fields.find((f) => f.col === 4);
    expect(field?.label).toBe("MBA");
  });

  it("propagates the inferred section to a neighboring bare-numeric column with no sampled data of its own", () => {
    // Real scenario: an optional repeated-qualification slot ("7") that
    // every sampled candidate left blank, right next to columns that DID
    // have data and resolved to Educational Qualifications.
    const headers = ["Added Time", "Full Name", "Email", "Post", "1", "2"];
    const rows = [[new Date(), "A", "a@b.com", "Commerce", "Examination:MBA,Year of Passing:2015", null]];
    const { config } = autoMapSheetColumns(headers, rows);
    const eduSection = config.sections.find((s) => s.name === "Educational Qualifications");
    expect(eduSection?.fields.some((f) => f.col === 5)).toBe(true);
  });
});

describe("autoMapSheetColumns — reports what it couldn't confidently detect", () => {
  it("flags missing required core roles instead of guessing silently", () => {
    const headers = ["Some Column", "Another Column"];
    const { unmatchedCoreRoles } = autoMapSheetColumns(headers, [["x", "y"]]);
    expect(unmatchedCoreRoles).toEqual(
      expect.arrayContaining(["addedTimeCol", "emailCol", "fullNameCol", "jobSelectorCol", "applicationNumberCol"]),
    );
  });

  it("does not flag optional core roles (mobile/dob/gender) as unmatched", () => {
    const headers = ["Added Time", "Full Name", "Email", "Post", "Unique ID"];
    const { unmatchedCoreRoles } = autoMapSheetColumns(headers, [[new Date(), "A", "a@b.com", "Commerce", "X-1"]]);
    expect(unmatchedCoreRoles).toEqual([]);
  });
});
