import { describe, expect, it } from "vitest";
import { shortenJobLabels } from "./job-labels";

describe("shortenJobLabels", () => {
  it("drops a repeated prefix and keeps only the differentiating qualifier", () => {
    const titles = [
      "Assistant Professor (Geography)",
      "Assistant Professor (English)",
      "Assistant Professor (History)",
      "Deputy Superintendent",
    ];
    // "Deputy Superintendent" has no shared prefix to strip and is longer
    // than the cap on its own, so it's truncated rather than shortened.
    expect(shortenJobLabels(titles)).toEqual(["Geography", "English", "History", "Deputy Superintende…"]);
  });

  it("leaves a one-off parenthetical title's prefix untouched since there's nothing to disambiguate", () => {
    // Still subject to the same length cap as any other label — both are
    // long enough on their own to get truncated, just not prefix-stripped.
    expect(shortenJobLabels(["Assistant Professor (Geography)", "Deputy Superintendent"])).toEqual([
      "Assistant Professor…",
      "Deputy Superintende…",
    ]);
  });

  it("supports the em-dash convention the same way", () => {
    const titles = ["Assistant Professor — Commerce", "Assistant Professor — Zoology"];
    expect(shortenJobLabels(titles)).toEqual(["Commerce", "Zoology"]);
  });

  it("strips a trailing batch tag after an em-dash qualifier, not instead of it", () => {
    // Regression: titles with BOTH an em-dash department AND a trailing
    // "(2026 Intake)" tag were matching the parenthetical as the qualifier
    // instead of the department, because "(" and "—" were treated as
    // interchangeable delimiters in one combined pattern. Real NBGSM data.
    const titles = [
      "Assistant Professor — Commerce (2026 Intake)",
      "Assistant Professor — Hindi (2026 Intake)",
      "Assistant Professor — Political Science (2026 Intake)",
      "Assistant Professor — Geography (2026 Intake)",
      "Assistant Professor — Sanskrit (2026 Intake)",
    ];
    expect(shortenJobLabels(titles)).toEqual(["Commerce", "Hindi", "Political Science", "Geography", "Sanskrit"]);
  });

  it("does not split on a plain hyphen", () => {
    const titles = ["Full-Time Assistant", "Full-Time Associate"];
    expect(shortenJobLabels(titles)).toEqual(["Full-Time Assistant", "Full-Time Associate"]);
  });

  it("truncates anything still too long after shortening", () => {
    const long = "A".repeat(40);
    expect(shortenJobLabels([long])[0]).toBe(`${"A".repeat(19)}…`);
  });
});
