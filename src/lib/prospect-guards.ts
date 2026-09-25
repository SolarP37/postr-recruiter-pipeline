import type { ProspectStatus } from "@prisma/client";
import { getSendingMode, type SendingMode } from "@/config/recruiter";

export type QualificationStatus =
  | "QUALIFIED"
  | "LIKELY_QUALIFIED"
  | "NEEDS_REVIEW"
  | "NOT_YET_QUALIFIED"
  | "DO_NOT_CONTACT";

export type OutreachGuardInput = {
  status: ProspectStatus;
  qualificationStatus: QualificationStatus;
  email: string | null;
  doNotContact: boolean;
  isSuppressed: boolean;
  isDuplicate: boolean;
  hasSentMessage: boolean;
};

export function canCreateOutreach(input: OutreachGuardInput): {
  allowed: boolean;
  reason?: string;
} {
  if (!input.email) return { allowed: false, reason: "Prospect has no email." };
  if (input.doNotContact || input.isSuppressed) {
    return { allowed: false, reason: "Prospect is suppressed." };
  }
  if (input.isDuplicate) {
    return { allowed: false, reason: "Duplicate contacts cannot enter outreach." };
  }
  if (
    input.qualificationStatus !== "QUALIFIED" &&
    input.qualificationStatus !== "LIKELY_QUALIFIED"
  ) {
    return {
      allowed: false,
      reason:
        input.qualificationStatus === "NEEDS_REVIEW"
          ? "Qualification needs human review."
          : "Prospect is not eligible for standard outreach.",
    };
  }
  if (input.status !== "APPROVED" && input.status !== "DRAFT_CREATED") {
    return { allowed: false, reason: "Prospect must be approved first." };
  }
  if (input.hasSentMessage) {
    return { allowed: false, reason: "A message has already been sent." };
  }
  return { allowed: true };
}

type DeliveryGuardInput = {
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED";
  sentAt: Date | null;
  suppressed: boolean;
  prospectDoNotContact: boolean;
  sendingMode?: SendingMode;
};

function approvedDeliveryGuard(input: DeliveryGuardInput) {
  if (input.approvalStatus !== "APPROVED") {
    return { allowed: false, reason: "Draft requires explicit approval." };
  }
  if (input.sentAt) {
    return { allowed: false, reason: "Draft has already been sent." };
  }
  if (input.suppressed || input.prospectDoNotContact) {
    return { allowed: false, reason: "Recipient is suppressed." };
  }
  return { allowed: true };
}

export function canCreateGmailDraft(input: DeliveryGuardInput) {
  const guard = approvedDeliveryGuard(input);
  if (!guard.allowed) return guard;
  const mode = input.sendingMode || getSendingMode();
  if (mode === "paused") {
    return { allowed: false, reason: "Outreach is paused." };
  }
  return { allowed: true };
}

export function canSendApprovedDraft(input: DeliveryGuardInput) {
  const guard = approvedDeliveryGuard(input);
  if (!guard.allowed) return guard;
  const mode = input.sendingMode || getSendingMode();
  if (mode !== "manual_send" && mode !== "approved_batch_send") {
    return {
      allowed: false,
      reason: "Sending is disabled. Gmail drafts remain in review-only mode.",
    };
  }
  return { allowed: true };
}

export function canBeginDeliveryAttempt(input: {
  existingAttemptStatus: "STARTED" | "CONFIRMED" | "AMBIGUOUS" | null;
}) {
  if (input.existingAttemptStatus === "CONFIRMED") {
    return { allowed: false, reason: "This message has already been delivered." };
  }
  if (input.existingAttemptStatus === "STARTED") {
    return {
      allowed: false,
      reason:
        "A delivery attempt is already in progress or awaiting reconciliation. Do not retry it.",
    };
  }
  if (input.existingAttemptStatus === "AMBIGUOUS") {
    return {
      allowed: false,
      reason:
        "Gmail delivery is ambiguous. Reconcile the attempt before taking any further action.",
    };
  }
  return { allowed: true };
}

export function followUpEligibility(input: {
  sentAt: Date | null;
  replyReceivedAt: Date | null;
  hardBouncedAt: Date | null;
  optedOutAt: Date | null;
  joinedAt: Date | null;
  suppressed: boolean;
  duplicate: boolean;
  followUpStage: number;
}) {
  if (input.duplicate) {
    return { allowed: false, reason: "Duplicate recipients cannot receive follow-up." };
  }
  if (
    input.replyReceivedAt ||
    input.hardBouncedAt ||
    input.optedOutAt ||
    input.joinedAt ||
    input.suppressed
  ) {
    return { allowed: false, reason: "A stop condition prevents follow-up." };
  }
  if (!input.sentAt) {
    return { allowed: false, reason: "Initial outreach has not been sent." };
  }
  if (input.followUpStage >= 2) {
    return { allowed: false, reason: "Maximum follow-up count reached." };
  }
  const delayDays = input.followUpStage === 0 ? 4 : 7;
  const earliestAt = new Date(
    input.sentAt.getTime() + delayDays * 24 * 60 * 60 * 1000,
  );
  return { allowed: true, earliestAt };
}
