import { describe, expect, it } from "vitest";
import {
  getFollowUpAutomationConfig,
  isFollowUpDue,
} from "@/lib/follow-up-automation";

const base = {
  sentAt: new Date("2026-08-01T00:00:00.000Z"),
  replyReceivedAt: null,
  hardBouncedAt: null,
  optedOutAt: null,
  joinedAt: null,
  suppressed: false,
  duplicate: false,
  followUpStage: 0,
  hasActiveDraft: false,
  now: new Date("2026-08-05T00:00:00.000Z"),
};

describe("scheduled follow-up draft automation", () => {
  it("is disabled by default and bounds its batch size", () => {
    expect(getFollowUpAutomationConfig({})).toEqual({
      enabled: false,
      limit: 3,
    });
    expect(
      getFollowUpAutomationConfig({
        AUTO_PREPARE_FOLLOWUPS: "true",
        AUTO_FOLLOWUP_PREP_LIMIT: "8",
      }),
    ).toEqual({ enabled: true, limit: 8 });
    expect(
      getFollowUpAutomationConfig({
        AUTO_PREPARE_FOLLOWUPS: "true",
        AUTO_FOLLOWUP_PREP_LIMIT: "99",
      }).limit,
    ).toBe(3);
  });

  it("queues only when the review-only follow-up is due", () => {
    expect(isFollowUpDue(base)).toBe(true);
    expect(
      isFollowUpDue({
        ...base,
        now: new Date("2026-08-04T23:59:59.000Z"),
      }),
    ).toBe(false);
  });

  it.each([
    { suppressed: true },
    { duplicate: true },
    { hasActiveDraft: true },
    { replyReceivedAt: new Date() },
    { hardBouncedAt: new Date() },
    { optedOutAt: new Date() },
    { joinedAt: new Date() },
  ])("stops for %o", (override) => {
    expect(isFollowUpDue({ ...base, ...override })).toBe(false);
  });
});
