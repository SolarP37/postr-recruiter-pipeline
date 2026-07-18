import { describe, expect, it } from "vitest";
import { canCreateOutreach, canSendApprovedDraft } from "@/lib/prospect-guards";

describe("outreach guards", () => {
  it("requires approval before creating outreach", () => {
    expect(canCreateOutreach({
      status: "NEEDS_REVIEW", email: "creator@example.com", doNotContact: false,
      isSuppressed: false, hasSentMessage: false,
    }).allowed).toBe(false);
  });

  it("blocks suppressed prospects", () => {
    expect(canCreateOutreach({
      status: "APPROVED", email: "creator@example.com", doNotContact: false,
      isSuppressed: true, hasSentMessage: false,
    }).allowed).toBe(false);
  });
});

describe("Gmail send guard", () => {
  it("requires separate message approval", () => {
    expect(canSendApprovedDraft({
      approvalStatus: "PENDING", sentAt: null, suppressed: false, prospectDoNotContact: false,
    }).allowed).toBe(false);
  });

  it("prevents duplicate sends", () => {
    expect(canSendApprovedDraft({
      approvalStatus: "APPROVED", sentAt: new Date(), suppressed: false, prospectDoNotContact: false,
    }).reason).toMatch(/already been sent/i);
  });

  it("allows an approved unsent, unsuppressed draft", () => {
    expect(canSendApprovedDraft({
      approvalStatus: "APPROVED", sentAt: null, suppressed: false, prospectDoNotContact: false,
    }).allowed).toBe(true);
  });
});
