import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { createTailoredOutreach } from "@/lib/outreach";
import { canCreateOutreach } from "@/lib/prospect-guards";

export class OutreachPreparationError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "OutreachPreparationError";
  }
}

export async function prepareOutreachDraft(prospectId: string) {
  const prospect = await db.prospect.findUnique({
    where: { id: prospectId },
    include: { outreachMessages: true },
  });
  if (!prospect) throw new OutreachPreparationError("Prospect not found.", 404);

  const [suppressed, duplicateCount] = await Promise.all([
    prospect.normalizedEmail
      ? db.suppressionEntry.findUnique({ where: { normalizedEmail: prospect.normalizedEmail } })
      : null,
    prospect.normalizedEmail
      ? db.prospect.count({ where: { normalizedEmail: prospect.normalizedEmail } })
      : 0,
  ]);
  const guard = canCreateOutreach({
    status: prospect.status,
    qualificationStatus: prospect.qualificationStatus,
    email: prospect.email,
    doNotContact: prospect.doNotContact,
    isSuppressed: Boolean(suppressed),
    isDuplicate: duplicateCount > 1,
    hasSentMessage: prospect.outreachMessages.some((item) => item.sentAt),
  });
  if (!guard.allowed) throw new OutreachPreparationError(guard.reason || "Outreach is not allowed.", 409);
  if (prospect.outreachMessages.some((item) => !item.sentAt && item.approvalStatus !== "REJECTED")) {
    throw new OutreachPreparationError("An active draft already exists.", 409);
  }

  const content = createTailoredOutreach(prospect);
  const [, message] = await db.$transaction([
    db.prospect.update({ where: { id: prospect.id }, data: { status: "DRAFT_CREATED" } }),
    db.outreachMessage.create({
      data: {
        prospectId: prospect.id,
        subject: content.subject,
        body: content.body,
        htmlBody: content.htmlBody,
      },
    }),
  ]);
  await audit("OUTREACH_PREPARED", "OutreachMessage", message.id, {
    prospectId: prospect.id,
    generatedFrom: prospect.leadType.toLowerCase(),
    reviewRequired: true,
  });
  return message;
}
