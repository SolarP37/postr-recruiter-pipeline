import type { ProspectStatus } from "@prisma/client";

export type OutreachGuardInput = {
  status: ProspectStatus;
  email: string | null;
  doNotContact: boolean;
  isSuppressed: boolean;
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
  if (input.status !== "APPROVED" && input.status !== "DRAFT_CREATED") {
    return { allowed: false, reason: "Prospect must be approved first." };
  }
  if (input.hasSentMessage) {
    return { allowed: false, reason: "A message has already been sent." };
  }
  return { allowed: true };
}

export function canSendApprovedDraft(input: {
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED";
  sentAt: Date | null;
  suppressed: boolean;
  prospectDoNotContact: boolean;
}) {
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
