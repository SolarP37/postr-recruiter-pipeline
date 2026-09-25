import { describe, expect, it } from "vitest";
import { canApplyReviewAction } from "@/lib/lifecycle";

describe("prospect review lifecycle", () => {
  it.each([
    "CAPTURED",
    "NEEDS_REVIEW",
    "REJECTED",
    "NO_EMAIL_FOUND",
  ] as const)("allows OCR reprocessing from %s", (status) => {
    expect(canApplyReviewAction(status, "reprocess").allowed).toBe(true);
  });

  it.each([
    "APPROVED",
    "DRAFT_CREATED",
    "SENT",
    "REPLIED",
    "INTERESTED",
    "REFERRAL_SENT",
    "JOINED",
    "BOUNCED",
    "OPTED_OUT",
    "SUPPRESSED",
  ] as const)("blocks OCR reprocessing after %s", (status) => {
    expect(canApplyReviewAction(status, "reprocess").allowed).toBe(false);
  });
});
