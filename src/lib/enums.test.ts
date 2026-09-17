import { describe, expect, it } from "vitest";
import { APPLICATION_STATUSES, SETTABLE_APPLICATION_STATUSES } from "./enums";

describe("SETTABLE_APPLICATION_STATUSES", () => {
  it("excludes draft and interview_scheduled", () => {
    // Regression test: a status change made through the generic
    // "change status" dropdown (the Applications list's bulk changer, or
    // an application's own quick-changer) used to allow setting
    // "interview_scheduled" directly — which just flipped the label with
    // no real interview record and no email to the candidate. Only
    // scheduleInterview (src/lib/actions/interviews.ts) should ever
    // produce that status, since it's the one that actually books the
    // interview and sends the notification.
    expect(SETTABLE_APPLICATION_STATUSES).not.toContain("draft");
    expect(SETTABLE_APPLICATION_STATUSES).not.toContain("interview_scheduled");
  });

  it("still includes every other real status", () => {
    const expected = APPLICATION_STATUSES.filter((s) => s !== "draft" && s !== "interview_scheduled");
    expect([...SETTABLE_APPLICATION_STATUSES].sort()).toEqual([...expected].sort());
  });
});
