import { describe, expect, it } from "vitest";
import {
  parseSynopsisConfig,
  defaultBlockOrder,
  resolveBlockOrder,
  sectionBlockId,
  isFormSectionBlock,
  formSectionIdFromBlock,
  CANDIDATE_DETAILS_BLOCK,
  APPLICATION_DETAILS_BLOCK,
  DECLARATION_BLOCK,
} from "./synopsis-config";

describe("parseSynopsisConfig", () => {
  const empty = {
    excludedCandidateFields: [],
    excludedApplicationFields: [],
    hideDeclaration: false,
    excludedFormSectionIds: [],
    blockOrder: [],
  };

  it("returns an empty (show-everything, default order) config for null, undefined, or empty input", () => {
    expect(parseSynopsisConfig(null)).toEqual(empty);
    expect(parseSynopsisConfig(undefined)).toEqual(empty);
    expect(parseSynopsisConfig("")).toEqual(empty);
  });

  it("falls back to show-everything for malformed JSON instead of throwing", () => {
    expect(parseSynopsisConfig("{not valid json")).toEqual(empty);
  });

  it("parses a fully-populated config", () => {
    const json = JSON.stringify({
      excludedCandidateFields: ["mobile", "gender"],
      excludedApplicationFields: ["department"],
      hideDeclaration: true,
      excludedFormSectionIds: ["sec1", "sec2"],
      blockOrder: ["section:sec3", CANDIDATE_DETAILS_BLOCK],
    });
    expect(parseSynopsisConfig(json)).toEqual({
      excludedCandidateFields: ["mobile", "gender"],
      excludedApplicationFields: ["department"],
      hideDeclaration: true,
      excludedFormSectionIds: ["sec1", "sec2"],
      blockOrder: ["section:sec3", CANDIDATE_DETAILS_BLOCK],
    });
  });

  it("ignores non-array/non-boolean values for the relevant fields rather than crashing", () => {
    const json = JSON.stringify({ excludedCandidateFields: "not-an-array", hideDeclaration: "yes", blockOrder: "nope" });
    const result = parseSynopsisConfig(json);
    expect(result.excludedCandidateFields).toEqual([]);
    // Only a literal boolean true counts — a truthy string like "yes" does not.
    expect(result.hideDeclaration).toBe(false);
    expect(result.blockOrder).toEqual([]);
  });
});

describe("sectionBlockId / isFormSectionBlock / formSectionIdFromBlock", () => {
  it("round-trips a section id through its block id", () => {
    const blockId = sectionBlockId("abc123");
    expect(blockId).toBe("section:abc123");
    expect(isFormSectionBlock(blockId)).toBe(true);
    expect(formSectionIdFromBlock(blockId)).toBe("abc123");
  });

  it("does not treat the fixed blocks as form-section blocks", () => {
    expect(isFormSectionBlock(CANDIDATE_DETAILS_BLOCK)).toBe(false);
    expect(isFormSectionBlock(APPLICATION_DETAILS_BLOCK)).toBe(false);
    expect(isFormSectionBlock(DECLARATION_BLOCK)).toBe(false);
  });
});

describe("defaultBlockOrder", () => {
  it("puts candidate details first, declaration last, form sections in between in their given order", () => {
    expect(defaultBlockOrder(["s1", "s2"])).toEqual([
      CANDIDATE_DETAILS_BLOCK,
      APPLICATION_DETAILS_BLOCK,
      "section:s1",
      "section:s2",
      DECLARATION_BLOCK,
    ]);
  });

  it("still includes the fixed blocks with no form sections at all", () => {
    expect(defaultBlockOrder([])).toEqual([CANDIDATE_DETAILS_BLOCK, APPLICATION_DETAILS_BLOCK, DECLARATION_BLOCK]);
  });
});

describe("resolveBlockOrder", () => {
  it("falls back to the default order when nothing has been saved", () => {
    expect(resolveBlockOrder([], ["s1", "s2"])).toEqual(defaultBlockOrder(["s1", "s2"]));
  });

  it("preserves a fully-valid saved order exactly", () => {
    const saved = [DECLARATION_BLOCK, "section:s2", CANDIDATE_DETAILS_BLOCK, "section:s1", APPLICATION_DETAILS_BLOCK];
    expect(resolveBlockOrder(saved, ["s1", "s2"])).toEqual(saved);
  });

  it("drops a block id for a section that no longer exists", () => {
    const saved = [CANDIDATE_DETAILS_BLOCK, "section:removed", APPLICATION_DETAILS_BLOCK, "section:s1", DECLARATION_BLOCK];
    const result = resolveBlockOrder(saved, ["s1"]);
    expect(result).not.toContain("section:removed");
    expect(result).toEqual([CANDIDATE_DETAILS_BLOCK, APPLICATION_DETAILS_BLOCK, "section:s1", DECLARATION_BLOCK]);
  });

  it("inserts a newly-added section instead of silently dropping it", () => {
    // Admin previously saved an order with only s1; s2 was added to the form afterward.
    const saved = [APPLICATION_DETAILS_BLOCK, CANDIDATE_DETAILS_BLOCK, "section:s1", DECLARATION_BLOCK];
    const result = resolveBlockOrder(saved, ["s1", "s2"]);
    expect(result).toContain("section:s2");
    expect(result).toHaveLength(5);
  });

  it("never loses or duplicates a block across saved + current sets", () => {
    const saved = ["section:s1", CANDIDATE_DETAILS_BLOCK];
    const result = resolveBlockOrder(saved, ["s1", "s2", "s3"]);
    const expectedBlocks = new Set(defaultBlockOrder(["s1", "s2", "s3"]));
    expect(new Set(result)).toEqual(expectedBlocks);
    expect(result).toHaveLength(expectedBlocks.size);
  });
});
