import { describe, expect, it } from "vitest";
import { parseSheetImportConfig, toSheetExportUrl } from "./types";

describe("toSheetExportUrl", () => {
  const id = "1CTwtKDyXwfsJkf1jC2TgWesEfYITfhk6Ni0wSeT2MBk";
  const expected = `https://docs.google.com/spreadsheets/d/${id}/export?format=xlsx`;

  it("converts a normal Share link", () => {
    expect(toSheetExportUrl(`https://docs.google.com/spreadsheets/d/${id}/edit?usp=sharing`)).toBe(expected);
  });

  it("converts a Share link with a sheet tab fragment", () => {
    expect(toSheetExportUrl(`https://docs.google.com/spreadsheets/d/${id}/edit#gid=0`)).toBe(expected);
  });

  it("converts a bare spreadsheet URL with no trailing path", () => {
    expect(toSheetExportUrl(`https://docs.google.com/spreadsheets/d/${id}`)).toBe(expected);
  });

  it("is idempotent on an already-correct export URL", () => {
    expect(toSheetExportUrl(expected)).toBe(expected);
  });

  it("leaves a non-Sheets URL untouched instead of mangling it", () => {
    const other = "https://example.com/not-a-sheet";
    expect(toSheetExportUrl(other)).toBe(other);
  });
});

describe("parseSheetImportConfig", () => {
  const validConfig = {
    formName: "Test Application",
    applicationNumberPrefix: "T-",
    jobTitleTemplate: "{value}",
    coreFields: {
      addedTimeCol: 0,
      emailCol: 1,
      fullNameCol: 2,
      mobileCol: null,
      dobCol: null,
      genderCol: null,
      jobSelectorCol: 3,
      applicationNumberCol: null,
    },
    sections: [{ name: "Personal Details", fields: [{ col: 4, fieldKey: "x", label: "X", fieldType: "text" }] }],
    documents: [],
  };

  it("parses a well-formed config", () => {
    const parsed = parseSheetImportConfig(JSON.stringify(validConfig));
    expect(parsed.formName).toBe("Test Application");
    expect(parsed.sections).toHaveLength(1);
  });

  it("rejects a config with no sections", () => {
    const bad = { ...validConfig, sections: [] };
    expect(() => parseSheetImportConfig(JSON.stringify(bad))).toThrow(/no sections/);
  });

  it("rejects a config with no coreFields", () => {
    const { coreFields: _coreFields, ...bad } = validConfig;
    expect(() => parseSheetImportConfig(JSON.stringify(bad))).toThrow(/no coreFields/);
  });
});
