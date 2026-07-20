import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiSession } from "@/lib/api-auth";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { EnvironmentPostrAdapter } from "@/lib/postr";
import { canApplyTrackingAction } from "@/lib/lifecycle";
import { createTailoredFollowUp } from "@/lib/outreach";
import {
  formatScheduledTime,
  suggestedSendAt,
} from "@/lib/outreach-schedule";
import { followUpEligibility } from "@/lib/prospect-guards";
import { requireSameOrigin } from "@/lib/request-security";

const schema = z.object({
  action: z.enum([
    "replied",
    "interested",
    "copy_referral",
    "referral_sent",
    "joined",
    "hard_bounce",
    "campaign_started",
    "campaign_completed",
    "record_commission",
    "schedule_follow_up",
    "cancel_follow_up",
  ]),
  amount: z.number().nonnegative().max(1_000_000).optional(),
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const crossSite = requireSameOrigin(request);
  if (crossSite) return crossSite;
  const unauthorized = await requireApiSession();
  if (unauthorized) return unauthorized;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid tracking action." }, { status: 400 });
  const { id } = await context.params;
  const prospect = await db.prospect.findUnique({
    where: { id },
    include: {
      outreachMessages: {
        orderBy: [{ followUpNumber: "asc" }, { createdAt: "asc" }],
      },
    },
  });
  if (!prospect) return NextResponse.json({ error: "Prospect not found." }, { status: 404 });
  if (prospect.doNotContact) return NextResponse.json({ error: "Suppressed prospect cannot advance." }, { status: 409 });
  if (parsed.data.action === "hard_bounce") {
    const now = new Date();
    await db.$transaction(async (transaction) => {
      await transaction.prospect.update({
        where: { id },
        data: {
          status: "BOUNCED",
          qualificationStatus: "DO_NOT_CONTACT",
          doNotContact: true,
          hardBouncedAt: now,
          nextFollowUpAt: null,
          suppressionReason: "Hard bounce",
        },
      });
      if (prospect.normalizedEmail) {
        await transaction.suppressionEntry.upsert({
          where: { normalizedEmail: prospect.normalizedEmail },
          create: { normalizedEmail: prospect.normalizedEmail, reason: "Hard bounce" },
          update: { reason: "Hard bounce" },
        });
      }
    });
    await audit("BOUNCE_RECORDED", "Prospect", id);
    return NextResponse.json({ message: "Hard bounce recorded and contact suppressed." });
  }
  if (parsed.data.action === "campaign_started") {
    if (!prospect.joinedAt) return NextResponse.json({ error: "Registration must be confirmed first." }, { status: 409 });
    await db.prospect.update({ where: { id }, data: { campaignStartedAt: new Date() } });
    await audit("CAMPAIGN_STARTED", "Prospect", id);
    return NextResponse.json({ message: "Campaign start recorded." });
  }
  if (parsed.data.action === "campaign_completed") {
    if (!prospect.campaignStartedAt) return NextResponse.json({ error: "Campaign start must be recorded first." }, { status: 409 });
    await db.prospect.update({ where: { id }, data: { campaignCompletedAt: new Date() } });
    await audit("CAMPAIGN_COMPLETED", "Prospect", id);
    return NextResponse.json({ message: "Campaign completion recorded." });
  }
  if (parsed.data.action === "record_commission") {
    if (!prospect.campaignCompletedAt || parsed.data.amount === undefined) {
      return NextResponse.json({ error: "A completed campaign and commission amount are required." }, { status: 409 });
    }
    await db.prospect.update({ where: { id }, data: { commissionAmount: parsed.data.amount } });
    await audit("COMMISSION_RECORDED", "Prospect", id, { amount: parsed.data.amount });
    return NextResponse.json({ message: "Commission recorded." });
  }
  if (parsed.data.action === "cancel_follow_up") {
    await db.$transaction([
      db.prospect.update({
        where: { id },
        data: { nextFollowUpAt: null },
      }),
      db.outreachMessage.updateMany({
        where: {
          prospectId: id,
          followUpNumber: { gt: 0 },
          sentAt: null,
          approvalStatus: { not: "REJECTED" },
        },
        data: {
          approvalStatus: "REJECTED",
          scheduledFor: null,
        },
      }),
    ]);
    await audit("FOLLOW_UP_CANCELED", "Prospect", id);
    return NextResponse.json({ message: "Follow-up canceled." });
  }
  if (parsed.data.action === "schedule_follow_up") {
    const activeDraft = prospect.outreachMessages.find(
      (message) =>
        !message.sentAt && message.approvalStatus !== "REJECTED",
    );
    if (activeDraft) {
      return NextResponse.json(
        { error: "Review the existing outreach draft before scheduling another attempt." },
        { status: 409 },
      );
    }
    const sentMessages = prospect.outreachMessages.filter(
      (message) => message.sentAt,
    );
    const lastSent = [...sentMessages]
      .sort(
        (left, right) =>
          (right.sentAt?.getTime() || 0) -
          (left.sentAt?.getTime() || 0),
      )[0];
    const followUpStage = sentMessages.reduce(
      (highest, message) =>
        Math.max(highest, message.followUpNumber),
      0,
    );
    const eligibility = followUpEligibility({
      sentAt: lastSent?.sentAt || null,
      replyReceivedAt: prospect.replyReceivedAt,
      hardBouncedAt: prospect.hardBouncedAt,
      optedOutAt: prospect.optedOutAt,
      joinedAt: prospect.joinedAt,
      suppressed: prospect.doNotContact,
      followUpStage,
    });
    if (!eligibility.allowed || !eligibility.earliestAt) {
      return NextResponse.json({ error: eligibility.reason }, { status: 409 });
    }
    const nextFollowUpNumber = (followUpStage + 1) as 1 | 2;
    const suggestion = suggestedSendAt({
      earliestAt: eligibility.earliestAt,
      timeZone: prospect.timeZone,
      preferredHourLocal: prospect.preferredSendHourLocal,
    });
    const content = createTailoredFollowUp(
      prospect,
      nextFollowUpNumber,
    );
    const [, draft] = await db.$transaction([
      db.prospect.update({
        where: { id },
        data: {
          nextFollowUpAt: suggestion.scheduledFor,
        },
      }),
      db.outreachMessage.create({
        data: {
          prospectId: id,
          subject: content.subject,
          body: content.body,
          htmlBody: content.htmlBody,
          followUpNumber: nextFollowUpNumber,
          scheduledFor: suggestion.scheduledFor,
        },
      }),
    ]);
    await audit("FOLLOW_UP_SCHEDULED", "OutreachMessage", draft.id, {
      prospectId: id,
      followUpNumber: nextFollowUpNumber,
      scheduledFor: suggestion.scheduledFor.toISOString(),
      timeZone: prospect.timeZone,
      reviewRequired: true,
    });
    return NextResponse.json({
      message: `Attempt ${nextFollowUpNumber + 1} draft created for review. Suggested window: ${formatScheduledTime(
        suggestion.scheduledFor,
        prospect.timeZone,
      )}${suggestion.usedTimeZone ? ` (${prospect.timeZone})` : " (timezone not recorded)"}.`,
    });
  }
  const transition = canApplyTrackingAction(prospect.status, parsed.data.action);
  if (!transition.allowed) {
    return NextResponse.json({ error: transition.reason }, { status: 409 });
  }
  const now = new Date();
  let data = {};
  let referralLink: string | undefined;
  if (parsed.data.action === "replied") data = { status: "REPLIED" as const, replyReceivedAt: now, nextFollowUpAt: null };
  if (parsed.data.action === "interested") data = { status: "INTERESTED" as const };
  if (parsed.data.action === "copy_referral") {
    try { referralLink = new EnvironmentPostrAdapter().getRecruiterLink(); }
    catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Referral link unavailable." }, { status: 409 }); }
    data = { referralLinkGeneratedAt: prospect.referralLinkGeneratedAt || now, referralLinkCopiedAt: now };
  }
  if (parsed.data.action === "referral_sent") data = { status: "REFERRAL_SENT" as const, referralLinkGeneratedAt: prospect.referralLinkGeneratedAt || now, referralLinkSentAt: now };
  if (parsed.data.action === "joined") data = { status: "JOINED" as const, joinedAt: now, nextFollowUpAt: null };
  await db.prospect.update({ where: { id }, data });
  await audit(`TRACKING_${parsed.data.action.toUpperCase()}`, "Prospect", id);
  return NextResponse.json({ message: "Tracking updated.", referralLink });
}
