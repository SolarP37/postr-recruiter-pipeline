import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { createTailoredFollowUp } from "@/lib/outreach";
import { suggestedSendAt } from "@/lib/outreach-schedule";
import { followUpEligibility } from "@/lib/prospect-guards";

export class FollowUpPreparationError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "FollowUpPreparationError";
  }
}

export async function prepareFollowUpDraft(prospectId: string) {
  const prospect = await db.prospect.findUnique({
    where: { id: prospectId },
    include: { outreachMessages: { orderBy: [{ followUpNumber: "asc" }, { createdAt: "asc" }] } },
  });
  if (!prospect) throw new FollowUpPreparationError("Prospect not found.", 404);
  if (prospect.outreachMessages.some((message) => !message.sentAt && message.approvalStatus !== "REJECTED")) {
    throw new FollowUpPreparationError("Review the existing outreach draft before preparing another attempt.", 409);
  }
  const [suppression, duplicateCount] = await Promise.all([
    prospect.normalizedEmail
      ? db.suppressionEntry.findUnique({ where: { normalizedEmail: prospect.normalizedEmail } })
      : null,
    prospect.normalizedEmail
      ? db.prospect.count({ where: { normalizedEmail: prospect.normalizedEmail } })
      : 0,
  ]);
  const sentMessages = prospect.outreachMessages.filter((message) => message.sentAt);
  const lastSent = [...sentMessages].sort((left, right) => (right.sentAt?.getTime() || 0) - (left.sentAt?.getTime() || 0))[0];
  const followUpStage = sentMessages.reduce((highest, message) => Math.max(highest, message.followUpNumber), 0);
  const eligibility = followUpEligibility({
    sentAt: lastSent?.sentAt || null,
    replyReceivedAt: prospect.replyReceivedAt,
    hardBouncedAt: prospect.hardBouncedAt,
    optedOutAt: prospect.optedOutAt,
    joinedAt: prospect.joinedAt,
    suppressed: prospect.doNotContact || Boolean(suppression),
    duplicate: duplicateCount > 1,
    followUpStage,
  });
  if (!eligibility.allowed || !eligibility.earliestAt) {
    throw new FollowUpPreparationError(eligibility.reason || "Follow-up is not allowed.", 409);
  }
  const followUpNumber = (followUpStage + 1) as 1 | 2;
  const suggestion = suggestedSendAt({
    earliestAt: eligibility.earliestAt,
    timeZone: prospect.timeZone,
    preferredHourLocal: prospect.preferredSendHourLocal,
  });
  const content = createTailoredFollowUp(prospect, followUpNumber);
  const [, draft] = await db.$transaction([
    db.prospect.update({ where: { id: prospectId }, data: { nextFollowUpAt: suggestion.scheduledFor } }),
    db.outreachMessage.create({
      data: {
        prospectId,
        subject: content.subject,
        body: content.body,
        htmlBody: content.htmlBody,
        followUpNumber,
        scheduledFor: suggestion.scheduledFor,
      },
    }),
  ]);
  await audit("FOLLOW_UP_SCHEDULED", "OutreachMessage", draft.id, {
    prospectId,
    followUpNumber,
    scheduledFor: suggestion.scheduledFor.toISOString(),
    reviewRequired: true,
    gmailDraftCreated: false,
    sent: false,
  });
  return { draft, scheduledFor: suggestion.scheduledFor, followUpNumber, usedTimeZone: suggestion.usedTimeZone };
}
