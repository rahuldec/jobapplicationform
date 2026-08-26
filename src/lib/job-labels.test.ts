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
    expect(shortenJobLabels(titles)).toEqual(["Geography", "English", "History", "Deputy Superintendent"]);
  });

  it("leaves a one-off parenthetical title's prefix untouched since there's nothing to disambiguate", () => {
    // Still subject to the same length cap as any other label — this one's
    // long enough on its own to get truncated, just not prefix-stripped.
    expect(shortenJobLabels(["Assistant Professor (Geography)", "Deputy Superintendent"])).toEqual([
      "Assistant Professor (Geog…",
      "Deputy Superintendent",
    ]);
  });

  it("supports the em-dash convention the same way", () => {
    const titles = ["Assistant Professor — Commerce", "Assistant Professor — Zoology"];
    expect(shortenJobLabels(titles)).toEqual(["Commerce", "Zoology"]);
  });

  it("does not split on a plain hyphen", () => {
    const titles = ["Full-Time Assistant", "Full-Time Associate"];
    expect(shortenJobLabels(titles)).toEqual(["Full-Time Assistant", "Full-Time Associate"]);
  });

  it("truncates anything still too long after shortening", () => {
    const long = "A".repeat(40);
    expect(shortenJobLabels([long])[0]).toBe(`${"A".repeat(25)}…`);
  });
});
