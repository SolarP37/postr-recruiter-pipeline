import type { OutreachPermissionBasis } from "@/lib/outreach-compliance";

export const AUTONOMY_POLICY_VERSION = "2026-08-23.1";
export type AutonomousAction = "CREATE_INTERNAL_DRAFT" | "CREATE_GMAIL_DRAFT" | "SEND_INITIAL" | "SEND_FOLLOW_UP";
export type AutonomyOutcome = "ALLOW" | "REVIEW" | "DENY";
export type AutonomousOutreachConfig = { enabled: boolean; paused: boolean; allowedCountries: ReadonlySet<string>; dailySendLimit: number; domainDailySendLimit: number; evidenceMaxAgeDays: number; contactEmail: string; postalAddress: string };
export type AutonomyPolicyInput = { action: AutonomousAction; countryCode: string | null; permissionBasis: OutreachPermissionBasis; permissionEvidence: string | null; permissionCheckedAt: Date | null; hasVerifiedContactEvidence: boolean; qualificationStatus: string; email: string | null; isDuplicate: boolean; isSuppressed: boolean; doNotContact: boolean; replyReceivedAt: Date | null; hardBouncedAt: Date | null; optedOutAt: Date | null; joinedAt: Date | null; sentAt: Date | null; existingDeliveryAttempt: boolean; dailySentCount: number; domainDailySentCount: number; now?: Date };
export type AutonomyPolicyDecision = { outcome: AutonomyOutcome; policyVersion: string; reasons: string[] };

const AUTOMATIC_PERMISSION_BASES = new Set<OutreachPermissionBasis>(["EXPRESS_CONSENT", "EXISTING_BUSINESS_RELATIONSHIP"]);
function boundedInteger(value: string | undefined, fallback: number, min: number, max: number) { const parsed = Number.parseInt(value || "", 10); return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback; }
function isFixtureValue(value: string) { const normalized = value.trim().toLowerCase(); return !normalized || normalized.includes(".test") || normalized.includes("example.") || normalized.includes("mailing address required"); }

export function getAutonomousOutreachConfig(env: NodeJS.ProcessEnv = process.env): AutonomousOutreachConfig {
  const allowedCountries = new Set((env.AUTONOMOUS_ALLOWED_COUNTRIES || "US").split(",").map((item) => item.trim().toUpperCase()).filter((item) => /^[A-Z]{2}$/.test(item)));
  return { enabled: env.AUTONOMOUS_OUTREACH_ENABLED === "true", paused: env.AUTONOMOUS_OUTREACH_PAUSED !== "false", allowedCountries, dailySendLimit: boundedInteger(env.AUTONOMOUS_DAILY_SEND_LIMIT, 5, 1, 100), domainDailySendLimit: boundedInteger(env.AUTONOMOUS_DOMAIN_DAILY_LIMIT, 1, 1, 10), evidenceMaxAgeDays: boundedInteger(env.AUTONOMOUS_EVIDENCE_MAX_AGE_DAYS, 180, 1, 365), contactEmail: env.OUTREACH_CONTACT_EMAIL || "", postalAddress: env.OUTREACH_POSTAL_ADDRESS || "" };
}

export function evaluateAutonomyPolicy(input: AutonomyPolicyInput, config: AutonomousOutreachConfig = getAutonomousOutreachConfig()): AutonomyPolicyDecision {
  const deny: string[] = []; const review: string[] = []; const now = input.now || new Date(); const countryCode = input.countryCode?.trim().toUpperCase() || ""; const isSend = input.action === "SEND_INITIAL" || input.action === "SEND_FOLLOW_UP";
  if (!input.email?.trim()) deny.push("Recipient email is missing.");
  if (input.isDuplicate) deny.push("Duplicate recipients cannot enter autonomous outreach.");
  if (input.isSuppressed || input.doNotContact) deny.push("Recipient is suppressed.");
  if (input.replyReceivedAt || input.hardBouncedAt || input.optedOutAt || input.joinedAt) deny.push("A reply, bounce, opt-out, or conversion stop condition is active.");
  if (!["QUALIFIED", "LIKELY_QUALIFIED"].includes(input.qualificationStatus)) deny.push("Prospect is not qualified for outreach.");
  if (isSend && input.sentAt) deny.push("Message has already been sent.");
  if (isSend && input.existingDeliveryAttempt) deny.push("A durable delivery attempt already exists.");
  if (!countryCode || !config.allowedCountries.has(countryCode)) review.push("Recipient country is not in the autonomous allowlist.");
  if (!AUTOMATIC_PERMISSION_BASES.has(input.permissionBasis)) review.push("Autonomous delivery requires express consent or an existing business relationship.");
  if (!input.permissionEvidence?.trim() || !input.permissionCheckedAt) review.push("Permission evidence and review time are required.");
  else if (now.getTime() - input.permissionCheckedAt.getTime() > config.evidenceMaxAgeDays * 86_400_000) review.push("Permission evidence is stale.");
  if (!input.hasVerifiedContactEvidence) review.push("A verified contact-evidence record is required.");
  if (isFixtureValue(config.contactEmail) || isFixtureValue(config.postalAddress)) review.push("Approved sender contact and postal details are not configured.");
  if (!config.enabled || config.paused) review.push("Autonomous outreach is in shadow or paused mode.");
  if (input.dailySentCount >= config.dailySendLimit) review.push("The global daily send budget is exhausted.");
  if (input.domainDailySentCount >= config.domainDailySendLimit) review.push("The recipient-domain daily budget is exhausted.");
  if (deny.length) return { outcome: "DENY", policyVersion: AUTONOMY_POLICY_VERSION, reasons: [...deny, ...review] };
  if (review.length) return { outcome: "REVIEW", policyVersion: AUTONOMY_POLICY_VERSION, reasons: review };
  return { outcome: "ALLOW", policyVersion: AUTONOMY_POLICY_VERSION, reasons: ["All deterministic autonomy gates passed."] };
}
