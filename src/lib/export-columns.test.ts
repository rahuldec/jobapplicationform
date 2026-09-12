import { describe, expect, it } from "vitest";
import { applyExportColumnsMapping, parseExportColumnsMapping } from "./export-columns";

describe("parseExportColumnsMapping", () => {
  it("returns null for null/empty input", () => {
    expect(parseExportColumnsMapping(null)).toBeNull();
    expect(parseExportColumnsMapping("")).toBeNull();
  });

  it("returns null for malformed JSON", () => {
    expect(parseExportColumnsMapping("{not json")).toBeNull();
  });

  it("returns null for a non-array JSON value", () => {
    expect(parseExportColumnsMapping(JSON.stringify({ foo: "bar" }))).toBeNull();
  });

  it("returns null for an empty array", () => {
    expect(parseExportColumnsMapping("[]")).toBeNull();
  });

  it("filters out malformed rules but keeps valid ones", () => {
    const json = JSON.stringify([
      { column: "Application #", displayName: "App No", sequence: 1 },
      { column: "Candidate Name" }, // missing displayName/sequence
      { displayName: "orphan" }, // missing column
      { column: "Email", displayName: "Email Address", sequence: 2 },
    ]);
    expect(parseExportColumnsMapping(json)).toEqual([
      { column: "Application #", displayName: "App No", sequence: 1 },
      { column: "Email", displayName: "Email Address", sequence: 2 },
    ]);
  });

  it("round-trips a valid mapping", () => {
    const rules = [
      { column: "Application #", displayName: "Receipt No.", sequence: 1 },
      { column: "Candidate Name", displayName: "Name", sequence: 2 },
    ];
    expect(parseExportColumnsMapping(JSON.stringify(rules))).toEqual(rules);
  });
});

describe("applyExportColumnsMapping", () => {
  const row = {
    "Application #": "DN-1",
    "Candidate Name": "Rahul Sharma",
    Email: "rahul@example.com",
    Status: "Submitted",
  };

  it("keeps only mapped columns, renamed, in sequence order", () => {
    const rules = [
      { column: "Candidate Name", displayName: "Name", sequence: 2 },
      { column: "Application #", displayName: "Receipt No.", sequence: 1 },
    ];
    expect(applyExportColumnsMapping(row, rules)).toEqual({
      "Receipt No.": "DN-1",
      Name: "Rahul Sharma",
    });
    // Object key insertion order should follow sequence, not rule array order.
    expect(Object.keys(applyExportColumnsMapping(row, rules))).toEqual(["Receipt No.", "Name"]);
  });

  it("skips a rule whose column doesn't exist on the row", () => {
    const rules = [{ column: "Nonexistent", displayName: "Whatever", sequence: 1 }];
    expect(applyExportColumnsMapping(row, rules)).toEqual({});
  });

  it("falls back to the raw column name when displayName is blank", () => {
    const rules = [{ column: "Email", displayName: "", sequence: 1 }];
    expect(applyExportColumnsMapping(row, rules)).toEqual({ Email: "rahul@example.com" });
  });
});
