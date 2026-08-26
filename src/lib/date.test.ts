import { afterEach, describe, expect, it, vi } from "vitest";
import { formatDate, formatDateTime, formatDateTimeFull, startOfTodayIST } from "./date";

describe("formatDate / formatDateTime / formatDateTimeFull", () => {
  it("renders in IST regardless of the runtime's own timezone", () => {
    // 2026-01-15 23:00 UTC = 2026-01-16 04:30 IST — a UTC-vs-IST mismatch
    // would show the wrong calendar day here.
    const d = new Date("2026-01-15T23:00:00.000Z");
    expect(formatDate(d)).toBe("16 Jan 2026");
    expect(formatDateTime(d)).toContain("16 Jan 2026");
    expect(formatDateTime(d)).toContain("4:30");
    expect(formatDateTimeFull(d)).toContain("16 January 2026");
  });
});

describe("startOfTodayIST", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the UTC instant of the most recent IST midnight, even just before it turns over", () => {
    // 2026-03-10 18:29 UTC = 2026-03-10 23:59 IST — still "10 March" in IST.
    vi.setSystemTime(new Date("2026-03-10T18:29:00.000Z"));
    // Midnight IST on 2026-03-10 = 2026-03-09T18:30:00.000Z.
    expect(startOfTodayIST().toISOString()).toBe("2026-03-09T18:30:00.000Z");
  });

  it("rolls over to the next IST day right at the boundary", () => {
    // 2026-03-10 18:30 UTC = 2026-03-11 00:00 IST exactly.
    vi.setSystemTime(new Date("2026-03-10T18:30:00.000Z"));
    expect(startOfTodayIST().toISOString()).toBe("2026-03-10T18:30:00.000Z");
  });

  it("is unaffected by the host process's own timezone", () => {
    const originalTZ = process.env.TZ;
    process.env.TZ = "America/Los_Angeles";
    vi.setSystemTime(new Date("2026-06-01T10:00:00.000Z"));
    // Same instant, same result regardless of process.env.TZ — Node reads
    // Intl timeZone from the option passed in, not the process's own zone.
    expect(startOfTodayIST().toISOString()).toBe("2026-05-31T18:30:00.000Z");
    process.env.TZ = originalTZ;
  });
});
