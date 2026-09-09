import type { ProspectStatus } from "@prisma/client";

export type ReviewAction =
  | "approve"
  | "edit"
  | "reject"
  | "no_email"
  | "reprocess"
  | "suppress";
export type TrackingAction =
  | "replied"
  | "interested"
  | "copy_referral"
  | "referral_sent"
  | "joined";

const reviewableStatuses = new Set<ProspectStatus>([
  "CAPTURED",
  "NEEDS_REVIEW",
  "REJECTED",
  "NO_EMAIL_FOUND",
]);

export function canApplyReviewAction(
  status: ProspectStatus,
  action: ReviewAction,
) {
  if (action === "suppress") return { allowed: true };
  return reviewableStatuses.has(status)
    ? { allowed: true }
    : { allowed: false, reason: "This prospect has already entered outreach." };
}

const trackingAllowedFrom: Record<TrackingAction, ProspectStatus[]> = {
  replied: ["SENT", "REPLIED"],
  interested: ["SENT", "REPLIED", "INTERESTED"],
  copy_referral: ["INTERESTED", "REFERRAL_SENT", "JOINED"],
  referral_sent: ["INTERESTED", "REFERRAL_SENT"],
  joined: ["REFERRAL_SENT", "JOINED"],
};

export function canApplyTrackingAction(
  status: ProspectStatus,
  action: TrackingAction,
) {
  return trackingAllowedFrom[action].includes(status)
    ? { allowed: true }
    : {
        allowed: false,
        reason: `Cannot mark ${action.replaceAll("_", " ")} from ${status.replaceAll("_", " ")}.`,
      };
}
