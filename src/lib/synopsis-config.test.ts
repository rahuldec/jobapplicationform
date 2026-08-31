import { describe, expect, it } from "vitest";
import { parseSynopsisConfig } from "./synopsis-config";

describe("parseSynopsisConfig", () => {
  it("returns an empty (show-everything) config for null, undefined, or empty input", () => {
    const empty = {
      excludedCandidateFields: [],
      excludedApplicationFields: [],
      hideDeclaration: false,
      excludedFormSectionIds: [],
    };
    expect(parseSynopsisConfig(null)).toEqual(empty);
    expect(parseSynopsisConfig(undefined)).toEqual(empty);
    expect(parseSynopsisConfig("")).toEqual(empty);
  });

  it("falls back to show-everything for malformed JSON instead of throwing", () => {
    expect(parseSynopsisConfig("{not valid json")).toEqual({
      excludedCandidateFields: [],
      excludedApplicationFields: [],
      hideDeclaration: false,
      excludedFormSectionIds: [],
    });
  });

  it("parses a fully-populated config", () => {
    const json = JSON.stringify({
      excludedCandidateFields: ["mobile", "gender"],
      excludedApplicationFields: ["department"],
      hideDeclaration: true,
      excludedFormSectionIds: ["sec1", "sec2"],
    });
    expect(parseSynopsisConfig(json)).toEqual({
      excludedCandidateFields: ["mobile", "gender"],
      excludedApplicationFields: ["department"],
      hideDeclaration: true,
      excludedFormSectionIds: ["sec1", "sec2"],
    });
  });

  it("ignores non-array values for the excluded-list fields rather than crashing", () => {
    const json = JSON.stringify({ excludedCandidateFields: "not-an-array", hideDeclaration: "yes" });
    const result = parseSynopsisConfig(json);
    expect(result.excludedCandidateFields).toEqual([]);
    // Only a literal boolean true counts — a truthy string like "yes" does not.
    expect(result.hideDeclaration).toBe(false);
  });
});
