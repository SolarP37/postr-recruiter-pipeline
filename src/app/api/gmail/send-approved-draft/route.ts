import { google } from "googleapis";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiSession } from "@/lib/api-auth";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { connectedGoogleClient } from "@/lib/gmail";
import { canSendApprovedDraft } from "@/lib/prospect-guards";
import { requireSameOrigin } from "@/lib/request-security";

const schema = z.object({ messageId: z.string().min(1), confirmation: z.literal("SEND") });

export async function POST(request: Request) {
  const crossSite = requireSameOrigin(request); if (crossSite) return crossSite;
  const unauthorized = await requireApiSession(); if (unauthorized) return unauthorized;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Separate SEND confirmation is required." }, { status: 400 });
  const message = await db.outreachMessage.findUnique({ where: { id: parsed.data.messageId }, include: { prospect: true } });
  if (!message?.gmailDraftId) return NextResponse.json({ error: "An approved Gmail draft is required." }, { status: 409 });
  const suppressed = message.prospect.normalizedEmail ? await db.suppressionEntry.findUnique({ where: { normalizedEmail: message.prospect.normalizedEmail } }) : null;
  const guard = canSendApprovedDraft({ approvalStatus: message.approvalStatus, sentAt: message.sentAt, suppressed: Boolean(suppressed), prospectDoNotContact: message.prospect.doNotContact });
  if (!guard.allowed) return NextResponse.json({ error: guard.reason }, { status: 409 });
  const auth = await connectedGoogleClient();
  const gmail = google.gmail({ version: "v1", auth });
  await gmail.users.drafts.send({ userId: "me", requestBody: { id: message.gmailDraftId } });
  const sentAt = new Date();
  await db.$transaction([
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
  await audit("GMAIL_DRAFT_SENT", "OutreachMessage", message.id);
  return NextResponse.json({ sent: true });
}
