import { db } from "@/lib/db";
import { evaluateAutonomyPolicy, type AutonomousAction } from "@/lib/autonomy-policy";
import { AgentTaskError } from "@/lib/agents/types";

function startOfUtcDay(now: Date) { return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())); }
function recipientDomain(email: string | null) { return email?.trim().toLowerCase().split("@")[1] || null; }

export async function evaluateAutonomousMessage(messageId: string, action: AutonomousAction) {
  const message = await db.outreachMessage.findUnique({ where: { id: messageId }, include: { deliveryAttempt: true, prospect: { include: { contactEvidence: true } } } });
  if (!message) throw new AgentTaskError("Outreach message not found.");
  const now = new Date(); const dayStart = startOfUtcDay(now); const domain = recipientDomain(message.prospect.normalizedEmail);
  const [duplicateCount, suppression, dailySentCount, domainDailySentCount] = await Promise.all([
    message.prospect.normalizedEmail ? db.prospect.count({ where: { normalizedEmail: message.prospect.normalizedEmail } }) : 0,
    message.prospect.normalizedEmail ? db.suppressionEntry.findUnique({ where: { normalizedEmail: message.prospect.normalizedEmail } }) : null,
    db.outreachMessage.count({ where: { sentAt: { gte: dayStart } } }),
    domain ? db.outreachMessage.count({ where: { sentAt: { gte: dayStart }, prospect: { normalizedEmail: { endsWith: `@${domain}` } } } }) : 0,
  ]);
  const decision = evaluateAutonomyPolicy({ action, countryCode: message.prospect.outreachCountryCode, permissionBasis: message.prospect.outreachPermissionBasis, permissionEvidence: message.prospect.outreachPermissionEvidence, permissionCheckedAt: message.prospect.outreachPermissionCheckedAt, hasVerifiedContactEvidence: message.prospect.contactEvidence.some((item) => Boolean(item.verifiedAt)), qualificationStatus: message.prospect.qualificationStatus, email: message.prospect.normalizedEmail, isDuplicate: duplicateCount > 1, isSuppressed: Boolean(suppression), doNotContact: message.prospect.doNotContact, replyReceivedAt: message.prospect.replyReceivedAt, hardBouncedAt: message.prospect.hardBouncedAt, optedOutAt: message.prospect.optedOutAt, joinedAt: message.prospect.joinedAt, sentAt: message.sentAt, existingDeliveryAttempt: Boolean(message.deliveryAttempt), dailySentCount, domainDailySentCount, now });
  const record = await db.autonomyDecision.create({ data: { prospectId: message.prospectId, outreachMessageId: message.id, action, outcome: decision.outcome, policyVersion: decision.policyVersion, reasons: JSON.stringify(decision.reasons), evidenceSnapshot: JSON.stringify({ countryCode: message.prospect.outreachCountryCode, permissionBasis: message.prospect.outreachPermissionBasis, permissionCheckedAt: message.prospect.outreachPermissionCheckedAt?.toISOString() || null, verifiedEvidenceCount: message.prospect.contactEvidence.filter((item) => item.verifiedAt).length, dailySentCount, domainDailySentCount }) } });
  return { decisionId: record.id, messageId, action, ...decision, executed: false };
}
