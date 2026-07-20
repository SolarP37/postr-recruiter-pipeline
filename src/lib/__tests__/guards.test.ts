import { describe, expect, it } from "vitest";
import {
  canCreateGmailDraft,
  canCreateOutreach,
  canSendApprovedDraft,
  followUpEligibility,
} from "@/lib/prospect-guards";

const outreachInput = {
  status: "APPROVED" as const,
  qualificationStatus: "QUALIFIED" as const,
  email: "creator@example.com",
  doNotContact: false,
  isSuppressed: false,
  isDuplicate: false,
  hasSentMessage: false,
};

describe("outreach guards", () => {
  it("blocks unqualified, review, suppressed, opted-out, and duplicate prospects", () => {
    expect(canCreateOutreach({ ...outreachInput, qualificationStatus: "NOT_YET_QUALIFIED" }).allowed).toBe(false);
    expect(canCreateOutreach({ ...outreachInput, qualificationStatus: "NEEDS_REVIEW" }).reason).toMatch(/human review/i);
    expect(canCreateOutreach({ ...outreachInput, isSuppressed: true }).allowed).toBe(false);
    expect(canCreateOutreach({ ...outreachInput, doNotContact: true }).allowed).toBe(false);
    expect(canCreateOutreach({ ...outreachInput, isDuplicate: true }).reason).toMatch(/duplicate/i);
  });

  it("allows qualified and likely qualified approved creators", () => {
    expect(canCreateOutreach(outreachInput).allowed).toBe(true);
    expect(canCreateOutreach({ ...outreachInput, qualificationStatus: "LIKELY_QUALIFIED" }).allowed).toBe(true);
  });
});

describe("Gmail delivery guards", () => {
  const approved = {
    approvalStatus: "APPROVED" as const,
    sentAt: null,
    suppressed: false,
    prospectDoNotContact: false,
  };

  it("allows an approved Gmail draft while draft-only mode blocks sending", () => {
    expect(canCreateGmailDraft({ ...approved, sendingMode: "draft_only" }).allowed).toBe(true);
    expect(canSendApprovedDraft({ ...approved, sendingMode: "draft_only" }).allowed).toBe(false);
  });

  it("requires approval and prevents duplicate sends", () => {
    expect(canCreateGmailDraft({ ...approved, approvalStatus: "PENDING" }).allowed).toBe(false);
    expect(canSendApprovedDraft({ ...approved, sentAt: new Date(), sendingMode: "manual_send" }).reason).toMatch(/already been sent/i);
  });
});

describe("follow-up guards", () => {
  const initial = new Date("2026-07-01T00:00:00Z");
  const base = {
    sentAt: initial,
    replyReceivedAt: null,
    hardBouncedAt: null,
    optedOutAt: null,
    joinedAt: null,
    suppressed: false,
    followUpStage: 0,
  };

  it("schedules no earlier than day 4 and limits follow-ups", () => {
    expect(followUpEligibility(base).earliestAt?.toISOString()).toBe("2026-07-05T00:00:00.000Z");
    expect(
      followUpEligibility({ ...base, followUpStage: 1 }).earliestAt?.toISOString(),
    ).toBe("2026-07-08T00:00:00.000Z");
    expect(followUpEligibility({ ...base, followUpStage: 2 }).allowed).toBe(false);
  });

  it.each(["replyReceivedAt", "hardBouncedAt", "optedOutAt", "joinedAt"] as const)(
    "stops after %s",
    (field) => {
      expect(followUpEligibility({ ...base, [field]: new Date() }).allowed).toBe(false);
    },
  );
});
