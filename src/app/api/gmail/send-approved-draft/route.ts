import { google } from "googleapis";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiSession } from "@/lib/api-auth";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { connectedGoogleClient } from "@/lib/gmail";
import {
  canBeginDeliveryAttempt,
  canSendApprovedDraft,
} from "@/lib/prospect-guards";
import { requireSameOrigin } from "@/lib/request-security";

const schema = z.object({ messageId: z.string().min(1), confirmation: z.literal("SEND") });

export async function POST(request: Request) {
  const crossSite = requireSameOrigin(request); if (crossSite) return crossSite;
  const unauthorized = await requireApiSession(); if (unauthorized) return unauthorized;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Separate SEND confirmation is required." }, { status: 400 });
  const message = await db.outreachMessage.findUnique({
    where: { id: parsed.data.messageId },
    include: { prospect: true, deliveryAttempt: true },
  });
  if (!message?.gmailDraftId) return NextResponse.json({ error: "An approved Gmail draft is required." }, { status: 409 });
  const suppressed = message.prospect.normalizedEmail ? await db.suppressionEntry.findUnique({ where: { normalizedEmail: message.prospect.normalizedEmail } }) : null;
  const guard = canSendApprovedDraft({ approvalStatus: message.approvalStatus, sentAt: message.sentAt, suppressed: Boolean(suppressed), prospectDoNotContact: message.prospect.doNotContact });
  if (!guard.allowed) return NextResponse.json({ error: guard.reason }, { status: 409 });
  const attemptGuard = canBeginDeliveryAttempt({
    existingAttemptStatus: message.deliveryAttempt?.status || null,
  });
  if (!attemptGuard.allowed) {
    return NextResponse.json({ error: attemptGuard.reason }, { status: 409 });
  }
  const attempt = await db.deliveryAttempt.create({
    data: { outreachMessageId: message.id },
  }).catch(() => null);
  if (!attempt) {
    return NextResponse.json(
      { error: "A delivery attempt already exists. Do not retry this message." },
      { status: 409 },
    );
  }
  const auth = await connectedGoogleClient();
  const gmail = google.gmail({ version: "v1", auth });
  try {
    const result = await gmail.users.drafts.send({
      userId: "me",
      requestBody: { id: message.gmailDraftId },
    });
    const sentAt = new Date();
    await db.$transaction([
      db.deliveryAttempt.update({
        where: { id: attempt.id },
        data: {
          status: "CONFIRMED",
          providerMessageId: result.data.id || null,
          completedAt: sentAt,
        },
      }),
      db.outreachMessage.update({ where: { id: message.id }, data: { sentAt } }),
      db.prospect.update({
        where: { id: message.prospectId },
        data: {
          status: "SENT",
          lastContactedAt: sentAt,
          nextFollowUpAt: null,
          followUpStage: Math.max(
            message.prospect.followUpStage,
            message.followUpNumber,
          ),
        },
      }),
    ]);
    await audit("GMAIL_DRAFT_SENT", "OutreachMessage", message.id, {
      deliveryAttemptId: attempt.id,
      providerMessageId: result.data.id || null,
    });
    return NextResponse.json({ sent: true });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Gmail delivery failed.";
    await db.deliveryAttempt.update({
      where: { id: attempt.id },
      data: {
        status: "AMBIGUOUS",
        errorMessage: detail.slice(0, 1000),
        completedAt: new Date(),
      },
    });
    await audit("GMAIL_SEND_AMBIGUOUS", "OutreachMessage", message.id, {
      deliveryAttemptId: attempt.id,
    });
    return NextResponse.json(
      {
        error:
          "Gmail delivery could not be confirmed. The attempt is locked to prevent a duplicate send; reconcile it in Gmail before proceeding.",
      },
      { status: 502 },
    );
  }
}
