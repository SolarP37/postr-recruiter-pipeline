import { RECRUITER_CONFIG } from "@/config/recruiter";
import type { QualificationStatus } from "@/lib/prospect-guards";

export function qualificationFromEvidence(input: {
  leadType?: "CREATOR" | "BRAND";
  followerCount: number | null;
  followerCountVerified: boolean;
  requestedStatus: QualificationStatus;
}): QualificationStatus {
  if (input.requestedStatus === "DO_NOT_CONTACT") return "DO_NOT_CONTACT";
  if (input.leadType === "BRAND") return input.requestedStatus;
  if (input.followerCountVerified && input.followerCount !== null) {
    return input.followerCount >= RECRUITER_CONFIG.minimumFollowerCount
      ? "QUALIFIED"
      : "NOT_YET_QUALIFIED";
  }
  if (input.requestedStatus === "QUALIFIED") return "NEEDS_REVIEW";
  return input.requestedStatus;
}
