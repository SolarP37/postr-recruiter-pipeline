import { describe, expect, it } from "vitest";
import { createTailoredFollowUp, createTailoredOutreach } from "@/lib/outreach";
import { reviewOutreachPermission } from "@/lib/outreach-compliance";
import { canBeginDeliveryAttempt, canCreateGmailDraft, canCreateOutreach, followUpEligibility } from "@/lib/prospect-guards";

describe("three-attempt outreach workflow", () => {
  it("qualifies, drafts, schedules two follow-ups, then stops", () => {
    expect(canCreateOutreach({ status: "APPROVED", qualificationStatus: "QUALIFIED", email: "patrickconlon88+postr-e2e@gmail.com", doNotContact: false, isSuppressed: false, isDuplicate: false, hasSentMessage: false }).allowed).toBe(true);
    expect(reviewOutreachPermission({ countryCode: "US", permissionBasis: "EXPRESS_CONSENT", evidence: "Internal test address controlled by recruiter", checkedAt: new Date("2026-07-21T00:00:00Z") }).allowed).toBe(true);
    expect(createTailoredOutreach({ leadType: "CREATOR", creatorFirstName: "Test", creatorCategory: "travel" }).body).toContain("Hi Test,");
    expect(canCreateGmailDraft({ approvalStatus: "APPROVED", sentAt: null, suppressed: false, prospectDoNotContact: false, sendingMode: "draft_only" }).allowed).toBe(true);
    expect(canBeginDeliveryAttempt({ existingAttemptStatus: null }).allowed).toBe(true);

    const initialSent = new Date("2026-07-21T14:00:00Z");
    const base = { sentAt: initialSent, replyReceivedAt: null, hardBouncedAt: null, optedOutAt: null, joinedAt: null, suppressed: false };
    expect(followUpEligibility({ ...base, followUpStage: 0 }).earliestAt?.toISOString()).toBe("2026-07-25T14:00:00.000Z");
    expect(followUpEligibility({ ...base, followUpStage: 1 }).earliestAt?.toISOString()).toBe("2026-07-28T14:00:00.000Z");
    expect(createTailoredFollowUp({ leadType: "CREATOR", creatorFirstName: "Test" }, 1).body).toContain("no obligation");
    expect(createTailoredFollowUp({ leadType: "CREATOR", creatorFirstName: "Test" }, 2).body).toContain("will not send another reminder");
    expect(followUpEligibility({ ...base, followUpStage: 2 }).allowed).toBe(false);
  });

  it("stops Gmail drafting and follow-ups after suppression or opt-out", () => {
    expect(canCreateGmailDraft({ approvalStatus: "APPROVED", sentAt: null, suppressed: true, prospectDoNotContact: false, sendingMode: "draft_only" }).allowed).toBe(false);
    expect(followUpEligibility({ sentAt: new Date(), replyReceivedAt: null, hardBouncedAt: null, optedOutAt: new Date(), joinedAt: null, suppressed: false, followUpStage: 0 }).allowed).toBe(false);
  });
});
