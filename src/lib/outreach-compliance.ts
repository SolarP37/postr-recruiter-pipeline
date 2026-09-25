export type OutreachPermissionBasis =
  | "UNKNOWN"
  | "EXPRESS_CONSENT"
  | "EXISTING_BUSINESS_RELATIONSHIP"
  | "CORPORATE_BUSINESS_CONTACT"
  | "PUBLICLY_LISTED_BUSINESS_CONTACT";

type ComplianceInput = {
  countryCode: string | null;
  permissionBasis: OutreachPermissionBasis;
  evidence: string | null;
  checkedAt: Date | null;
};

const CONSENT_BASES = new Set<OutreachPermissionBasis>([
  "EXPRESS_CONSENT",
  "EXISTING_BUSINESS_RELATIONSHIP",
]);

export function reviewOutreachPermission(input: ComplianceInput): {
  allowed: boolean;
  reason?: string;
} {
  const countryCode = input.countryCode?.trim().toUpperCase() || "";
  if (!countryCode || !/^[A-Z]{2}$/.test(countryCode)) {
    return { allowed: false, reason: "Record the recipient country using a two-letter country code." };
  }
  if (input.permissionBasis === "UNKNOWN") {
    return { allowed: false, reason: "Select and document a lawful outreach permission basis." };
  }
  if (!input.evidence?.trim() || !input.checkedAt) {
    return { allowed: false, reason: "Permission evidence and its review timestamp are required." };
  }

  if (countryCode === "CA" && !CONSENT_BASES.has(input.permissionBasis)) {
    return { allowed: false, reason: "Canadian outreach requires recorded consent or an existing business relationship in this workflow." };
  }
  if (
    (countryCode === "GB" || countryCode === "UK") &&
    !CONSENT_BASES.has(input.permissionBasis) &&
    input.permissionBasis !== "CORPORATE_BUSINESS_CONTACT"
  ) {
    return { allowed: false, reason: "UK outreach requires consent, an existing relationship, or a documented corporate-business contact." };
  }
  if (countryCode !== "US" && countryCode !== "GB" && countryCode !== "UK" && countryCode !== "CA" && !CONSENT_BASES.has(input.permissionBasis)) {
    return { allowed: false, reason: "This jurisdiction defaults to consent-based outreach until its rules are reviewed." };
  }
  return { allowed: true };
}
